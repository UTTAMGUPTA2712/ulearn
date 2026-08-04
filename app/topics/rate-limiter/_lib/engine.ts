import type {
  Algorithm,
  AttackType,
  BlockedPacket,
  ClientState,
  LogEntry,
  NetworkAttackKind,
  RequestPacket,
  SimSnapshot,
} from "./types";

const TO_LIMITER_MS = 220;
const TO_GLOBAL_MS = 160;
const TO_API_MIN_MS = 380;
const TO_API_MAX_MS = 540;
const RETURN_MS = 220;
const LINGER_MS = 260;
const HAMMER_COUNT = 8;
const HAMMER_STAGGER_MS = 70;

/** How long a Slowloris connection stays open before it's force-closed and its slot freed. */
const SLOWLORIS_HOLD_MIN_MS = 3000;
const SLOWLORIS_HOLD_MAX_MS = 6000;
const SLOWLORIS_SPAWN_RATE = 4;

/** How long a blocked network-layer packet flashes before disappearing — it never had a real lifecycle. */
const BLOCKED_LIFETIME_MS = 420;
const NETWORK_ATTACK_SPAWN_RATE = 55;

/**
 * How many requests the API can have in flight at once. A per-IP limiter
 * passes each spoofed DDoS address individually, but the backend behind it
 * still has finite capacity — once more requests are converging on it than
 * this, arrivals get dropped with a 503 even though the limiter waved them
 * through. This is what makes a DDoS run visibly fail differently from a
 * single hammered client: 429s barely move, 503s climb instead.
 */
const MAX_CONCURRENT_API = 14;

/** Safety valve so a DDoS demo can't grow the packet array without bound. */
const MAX_VISIBLE_REQUESTS = 70;
const MAX_LOG_LINES = 60;

const REGULAR_CLIENTS = ["10.0.0.2", "10.0.0.3", "10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7"];
/** The one client the "Hammer" button targets, so its throttling is easy to follow. */
const HAMMER_TARGET = REGULAR_CLIENTS[0];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

let requestIdCounter = 0;
let logIdCounter = 0;
let blockedIdCounter = 0;

/**
 * Owns the entire simulated world: per-client limiter state, in-flight
 * requests, the active algorithm and a short event log. Mutated in place on
 * every `tick()` — `getSnapshot()` is the only thing that leaves the engine.
 *
 * Spoofed DDoS clients are deliberately never persisted into `clients` (see
 * `resolveAtLimiter`) — each one gets a fresh, full quota, which is exactly
 * the failure mode a per-IP limiter has against a distributed flood.
 */
export class RateLimiterEngine {
  now = 0;
  algorithm: Algorithm = "fixed-window";
  limit = 5;
  windowMs = 4000;
  refillRate = 2;
  requests: RequestPacket[] = [];
  blockedPackets: BlockedPacket[] = [];
  log: LogEntry[] = [];
  stats = { sent: 0, allowed: 0, limited: 0, throttled: 0, overloaded: 0, blocked: 0 };
  autoStream = false;
  autoStreamRate = 2;

  /** Which attack, if any, is currently running. Only one at a time — see `setAttack`. */
  activeAttack: AttackType | null = null;
  /** How many simultaneous slow, incomplete connections the server can hold open before refusing new ones. */
  slowlorisCapacity = 20;
  private attackAccumulator = 0;
  /**
   * Distinct spoofed source addresses seen in the current attack run. The
   * diagram has exactly one "clients" node, so without this the flood just
   * looks like one caller sending a lot of traffic — this is what makes the
   * "thousands of different machines" part visible.
   */
  private attackSourceIds = new Set<string>();

  /**
   * Server-wide token bucket sitting between the per-client limiter and the
   * API. Per-client limiting alone can't see a distributed flood — every
   * spoofed IP looks like a fresh caller with a full quota — so this is what
   * actually protects the API's shared capacity once a DDoS run is active.
   */
  globalLimiterActive = false;
  globalCapacity = 12;
  globalRefillRate = 12;
  private globalTokens = this.globalCapacity;
  private lastGlobalRefill = 0;

  private clients = new Map<string, ClientState>();
  private spawnAccumulator = 0;

  constructor() {
    REGULAR_CLIENTS.forEach((id) => this.clients.set(id, this.freshClientState(id)));
  }

  private freshClientState(clientId: string): ClientState {
    return {
      clientId,
      windowStart: this.now,
      windowCount: 0,
      log: [],
      tokens: this.limit,
      lastRefill: this.now,
      level: 0,
      lastLeak: this.now,
      allowed: 0,
      limited: 0,
    };
  }

  private addLog(level: LogEntry["level"], message: string) {
    this.log.push({ id: logIdCounter++, time: this.now, level, message });
    if (this.log.length > MAX_LOG_LINES) this.log.shift();
  }

  setAlgorithm(algorithm: Algorithm) {
    this.algorithm = algorithm;
    this.addLog("info", `Algorithm switched to ${algorithm}`);
  }

  setLimit(limit: number) {
    this.limit = Math.max(1, Math.min(20, limit));
  }

  setWindowMs(ms: number) {
    this.windowMs = Math.max(1000, Math.min(10000, ms));
  }

  setRefillRate(rate: number) {
    this.refillRate = Math.max(1, Math.min(10, rate));
  }

  setAutoStream(enabled: boolean, rate?: number) {
    this.autoStream = enabled;
    if (rate !== undefined) this.autoStreamRate = rate;
  }

  setAttack(attack: AttackType | null) {
    this.activeAttack = attack;
    this.attackAccumulator = 0;
    // Starting a (possibly new) run gets a clean count; stopping leaves the
    // final tally visible instead of wiping it the instant you hit stop.
    if (attack) this.attackSourceIds.clear();

    const labels: Record<AttackType, string> = {
      "http-flood": "HTTP flood — flooding from spoofed source IPs, one complete request each",
      slowloris: "Slowloris — opening many slow, incomplete connections that never finish a request",
      "syn-flood": "SYN flood — half-open TCP handshakes; never reaches the HTTP layer at all",
      "udp-amplification": "UDP amplification — volumetric traffic saturating bandwidth upstream of this server",
    };

    if (attack) {
      this.addLog("warn", `Attack started: ${labels[attack]}`);
    } else {
      this.addLog("info", "Attack simulation stopped");
    }
  }

  setGlobalLimiter(active: boolean) {
    this.globalLimiterActive = active;
    if (active) this.globalTokens = this.globalCapacity;
    this.addLog(
      active ? "info" : "warn",
      active
        ? "Server-wide limiter enabled — throttling aggregate traffic before it reaches the API"
        : "Server-wide limiter disabled",
    );
  }

  setGlobalCapacity(capacity: number) {
    this.globalCapacity = Math.max(1, Math.min(50, capacity));
  }

  setGlobalRefillRate(rate: number) {
    this.globalRefillRate = Math.max(1, Math.min(60, rate));
  }

  private refillGlobalTokens() {
    const elapsedSec = (this.now - this.lastGlobalRefill) / 1000;
    this.lastGlobalRefill = this.now;
    this.globalTokens = Math.min(this.globalCapacity, this.globalTokens + elapsedSec * this.globalRefillRate);
  }

  spawnRequest(opts?: { isDdos?: boolean; clientId?: string; attackKind?: "http-flood" | "slowloris" }) {
    if (this.requests.length >= MAX_VISIBLE_REQUESTS) return;

    const isDdos = opts?.isDdos ?? false;
    const attackKind = opts?.attackKind;
    const clientId =
      opts?.clientId ??
      (attackKind === "slowloris"
        ? `198.51.100.${Math.floor(Math.random() * 254) + 1}`
        : isDdos
          ? `203.0.113.${Math.floor(Math.random() * 254) + 1}`
          : REGULAR_CLIENTS[Math.floor(Math.random() * REGULAR_CLIENTS.length)]);

    if (isDdos) this.attackSourceIds.add(clientId);

    if (attackKind === "slowloris") {
      // Never sends a complete request, so it has nothing for the per-client
      // or global limiter to count — it goes straight at the API's raw
      // connection handling instead. See `resolveSlowlorisArrival`.
      this.requests.push({
        id: requestIdCounter++,
        clientId,
        phase: "to-api",
        phaseStart: this.now,
        phaseDuration: randomBetween(TO_API_MIN_MS, TO_API_MAX_MS),
        outcome: null,
        isDdos: true,
        attackKind,
      });
      this.stats.sent++;
      return;
    }

    this.requests.push({
      id: requestIdCounter++,
      clientId,
      phase: "to-limiter",
      phaseStart: this.now,
      phaseDuration: TO_LIMITER_MS,
      outcome: null,
      isDdos,
      attackKind,
    });
    this.stats.sent++;
  }

  /**
   * Network/protocol-layer attack traffic (SYN flood, UDP amplification)
   * never becomes an HTTP request — there's nothing for an app-layer rate
   * limiter to see. Tracked separately from `requests` and rendered flashing
   * out before the client node, then discarded.
   */
  private spawnBlocked(kind: NetworkAttackKind) {
    if (this.blockedPackets.length >= MAX_VISIBLE_REQUESTS) return;
    const clientId = `192.0.2.${Math.floor(Math.random() * 254) + 1}`;
    this.attackSourceIds.add(clientId);
    this.blockedPackets.push({ id: blockedIdCounter++, kind, spawnTime: this.now, clientId });
    this.stats.sent++;
    this.stats.blocked++;
  }

  /** Fires a rapid burst from one fixed client, so throttling is easy to see happening to a single caller. */
  hammerClient() {
    for (let i = 0; i < HAMMER_COUNT; i++) {
      if (this.requests.length >= MAX_VISIBLE_REQUESTS) break;
      this.requests.push({
        id: requestIdCounter++,
        clientId: HAMMER_TARGET,
        phase: "to-limiter",
        phaseStart: this.now,
        phaseDuration: TO_LIMITER_MS + i * HAMMER_STAGGER_MS,
        outcome: null,
        isDdos: false,
      });
      this.stats.sent++;
    }
    this.addLog("warn", `Hammering ${HAMMER_TARGET} with ${HAMMER_COUNT} rapid requests`);
  }

  /** Keeps a client's window/token/leak state current even between requests, so gauges animate live. */
  private updateClient(client: ClientState) {
    if (this.now - client.windowStart >= this.windowMs) {
      client.windowStart = this.now;
      client.windowCount = 0;
    }

    const cutoff = this.now - this.windowMs;
    if (client.log.length > 0 && client.log[0] <= cutoff) {
      client.log = client.log.filter((t) => t > cutoff);
    }

    const elapsedRefillSec = (this.now - client.lastRefill) / 1000;
    client.lastRefill = this.now;
    client.tokens = Math.min(this.limit, client.tokens + elapsedRefillSec * this.refillRate);

    const elapsedLeakSec = (this.now - client.lastLeak) / 1000;
    client.lastLeak = this.now;
    client.level = Math.max(0, client.level - elapsedLeakSec * this.refillRate);
  }

  private checkLimit(client: ClientState): boolean {
    switch (this.algorithm) {
      case "fixed-window": {
        if (client.windowCount < this.limit) {
          client.windowCount++;
          return true;
        }
        return false;
      }
      case "sliding-window": {
        if (client.log.length < this.limit) {
          client.log.push(this.now);
          return true;
        }
        return false;
      }
      case "token-bucket": {
        if (client.tokens >= 1) {
          client.tokens -= 1;
          return true;
        }
        return false;
      }
      case "leaky-bucket": {
        if (client.level < this.limit) {
          client.level += 1;
          return true;
        }
        return false;
      }
    }
  }

  private resolveAtLimiter(req: RequestPacket) {
    // Spoofed DDoS IPs are never persisted — each one is a first-time caller
    // with a full quota, which is the point being demonstrated.
    const persist = !req.isDdos;
    let client = this.clients.get(req.clientId);
    if (!client) {
      client = this.freshClientState(req.clientId);
      if (persist) this.clients.set(req.clientId, client);
    } else {
      this.updateClient(client);
    }

    const allowed = this.checkLimit(client);

    if (allowed) {
      client.allowed++;
      req.outcome = "allowed";
      if (this.globalLimiterActive) {
        req.phase = "to-global";
        req.phaseStart = this.now;
        req.phaseDuration = TO_GLOBAL_MS;
      } else {
        req.phase = "to-api";
        req.phaseStart = this.now;
        req.phaseDuration = randomBetween(TO_API_MIN_MS, TO_API_MAX_MS);
      }
      // Final outcome (success vs. throttled vs. API overload) is decided further downstream.
    } else {
      client.limited++;
      req.outcome = "limited";
      req.phase = "returning";
      req.phaseStart = this.now;
      req.phaseDuration = RETURN_MS;
      this.stats.limited++;
      const tag = req.isDdos ? `${req.clientId} (flood)` : req.clientId;
      this.addLog("warn", `429 — ${tag} rate-limited`);
    }
  }

  /**
   * The server-wide checkpoint: unlike the per-client limiter, this bucket is
   * shared across every client and spoofed IP, so a distributed flood can't
   * dodge it by rotating source addresses.
   */
  private resolveAtGlobal(req: RequestPacket) {
    this.refillGlobalTokens();

    if (this.globalTokens >= 1) {
      this.globalTokens -= 1;
      req.phase = "to-api";
      req.phaseStart = this.now;
      req.phaseDuration = randomBetween(TO_API_MIN_MS, TO_API_MAX_MS);
      return;
    }

    req.outcome = "throttled";
    req.phase = "returning";
    req.phaseStart = this.now;
    req.phaseDuration = RETURN_MS;
    this.stats.throttled++;
    const tag = req.isDdos ? `${req.clientId} (flood)` : req.clientId;
    this.addLog("warn", `429 — ${tag} throttled by server-wide limiter`);
  }

  private finalizeAtApi(req: RequestPacket) {
    const concurrentAtApi = this.requests.filter(
      (r) => r.id !== req.id && r.phase === "to-api",
    ).length;

    req.phase = "returning";
    req.phaseStart = this.now;
    req.phaseDuration = RETURN_MS;

    if (concurrentAtApi >= MAX_CONCURRENT_API) {
      req.outcome = "overloaded";
      this.stats.overloaded++;
      const tag = req.isDdos ? `${req.clientId} (flood)` : req.clientId;
      this.addLog("error", `503 — API overloaded, dropped request from ${tag}`);
      return;
    }

    req.outcome = "allowed";
    this.stats.allowed++;
  }

  /**
   * Slowloris connections skip both limiters entirely (see `spawnRequest`),
   * so the only thing that can push back on them is the API's raw
   * connection-slot capacity — a different, much larger pool than
   * `MAX_CONCURRENT_API`, and one a request-counting limiter never touches.
   */
  private resolveSlowlorisArrival(req: RequestPacket) {
    const held = this.requests.filter((r) => r.phase === "held").length;

    if (held >= this.slowlorisCapacity) {
      req.outcome = "overloaded";
      req.phase = "returning";
      req.phaseStart = this.now;
      req.phaseDuration = RETURN_MS;
      this.stats.overloaded++;
      this.addLog("error", `503 — connection slots exhausted, ${req.clientId} (Slowloris) refused`);
      return;
    }

    req.phase = "held";
    req.phaseStart = this.now;
    req.phaseDuration = randomBetween(SLOWLORIS_HOLD_MIN_MS, SLOWLORIS_HOLD_MAX_MS);
  }

  tick(deltaMs: number) {
    this.now += deltaMs;

    for (const client of this.clients.values()) this.updateClient(client);
    this.refillGlobalTokens();

    if (this.autoStream) {
      this.spawnAccumulator += (this.autoStreamRate * deltaMs) / 1000;
      while (this.spawnAccumulator >= 1) {
        this.spawnAccumulator -= 1;
        this.spawnRequest();
      }
    }

    if (this.activeAttack === "http-flood") {
      // Deliberately high enough to push a tight per-IP limit toward its
      // organic throttling point on its own.
      const rate = Math.max(this.autoStreamRate * 10, 40);
      this.attackAccumulator += (rate * deltaMs) / 1000;
      while (this.attackAccumulator >= 1) {
        this.attackAccumulator -= 1;
        this.spawnRequest({ isDdos: true, attackKind: "http-flood" });
      }
    } else if (this.activeAttack === "slowloris") {
      // Each connection ties up a slot for seconds, so it doesn't need a
      // high spawn rate to exhaust `slowlorisCapacity`.
      this.attackAccumulator += (SLOWLORIS_SPAWN_RATE * deltaMs) / 1000;
      while (this.attackAccumulator >= 1) {
        this.attackAccumulator -= 1;
        this.spawnRequest({ isDdos: true, attackKind: "slowloris" });
      }
    } else if (this.activeAttack === "syn-flood" || this.activeAttack === "udp-amplification") {
      this.attackAccumulator += (NETWORK_ATTACK_SPAWN_RATE * deltaMs) / 1000;
      while (this.attackAccumulator >= 1) {
        this.attackAccumulator -= 1;
        this.spawnBlocked(this.activeAttack);
      }
    }

    const blockedCutoff = this.now - BLOCKED_LIFETIME_MS;
    this.blockedPackets = this.blockedPackets.filter((b) => b.spawnTime > blockedCutoff);

    for (const req of this.requests) {
      if (req.phase === "done") continue;

      const elapsed = this.now - req.phaseStart;
      if (elapsed < req.phaseDuration) continue;

      switch (req.phase) {
        case "to-limiter":
          this.resolveAtLimiter(req);
          break;
        case "to-global":
          this.resolveAtGlobal(req);
          break;
        case "to-api":
          if (req.attackKind === "slowloris") {
            this.resolveSlowlorisArrival(req);
          } else {
            this.finalizeAtApi(req);
          }
          break;
        case "held":
          // Timed out and force-closed — no response to bounce back, it just
          // frees the slot it was holding.
          req.phase = "done";
          req.phaseStart = this.now;
          req.phaseDuration = LINGER_MS;
          break;
        case "returning":
          req.phase = "done";
          req.phaseStart = this.now;
          req.phaseDuration = LINGER_MS;
          break;
      }
    }

    this.requests = this.requests.filter(
      (r) => !(r.phase === "done" && this.now - r.phaseStart >= r.phaseDuration),
    );
  }

  getSnapshot(): SimSnapshot {
    return {
      now: this.now,
      algorithm: this.algorithm,
      limit: this.limit,
      windowMs: this.windowMs,
      refillRate: this.refillRate,
      requests: this.requests.map((r) => ({ ...r })),
      clients: REGULAR_CLIENTS.map((id) => ({ ...this.clients.get(id)! })),
      log: [...this.log],
      stats: { ...this.stats },
      autoStream: this.autoStream,
      autoStreamRate: this.autoStreamRate,
      activeAttack: this.activeAttack,
      attackSourceCount: this.attackSourceIds.size,
      blockedPackets: this.blockedPackets.map((b) => ({ ...b })),
      slowlorisHeld: this.requests.filter((r) => r.phase === "held").length,
      slowlorisCapacity: this.slowlorisCapacity,
      globalLimiterActive: this.globalLimiterActive,
      globalCapacity: this.globalCapacity,
      globalRefillRate: this.globalRefillRate,
      globalTokens: this.globalTokens,
    };
  }
}
