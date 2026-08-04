import type { Algorithm, Backend, Fault, LogEntry, RequestOutcome, RequestPacket, SimSnapshot } from "./types";

const TO_LB_MS = 260;
const TO_BACKEND_MIN_MS = 480;
const TO_BACKEND_MAX_MS = 680;
const SLOW_MULTIPLIER = 2.6;
const STALL_TIMEOUT_MS = 1000;
const RETURN_MS = 240;
const LINGER_MS = 260;

/** A real LB would queue past this; here it just refuses outright. */
const MAX_CONCURRENT_PER_BACKEND = 6;
/** Safety valve so a DDoS demo can't grow the packet array without bound. */
const MAX_VISIBLE_REQUESTS = 70;
const AUTO_DOWN_THRESHOLD = 3;
const MAX_LOG_LINES = 60;

const REGULAR_CLIENTS = ["10.0.0.2", "10.0.0.3", "10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7"];
const REQUEST_PATHS = ["/home", "/api/users", "/api/orders", "/checkout", "/search", "/static/app.js"];

function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

let requestIdCounter = 0;
let logIdCounter = 0;

/**
 * Owns the entire simulated world: backends, in-flight requests, the routing
 * algorithm and a short event log. Mutated in place on every `tick()` for
 * performance — `getSnapshot()` is the only thing that leaves the engine, and
 * it always returns fresh objects/arrays so React sees a real change.
 */
export class LoadBalancerEngine {
  now = 0;
  algorithm: Algorithm = "round-robin";
  backends: Backend[];
  requests: RequestPacket[] = [];
  log: LogEntry[] = [];
  stats = { sent: 0, success: 0, error: 0, timeout: 0, rejected: 0 };
  autoStream = false;
  autoStreamRate = 2;
  ddosActive = false;

  private rrCursor = 0;
  private spawnAccumulator = 0;

  constructor(backendCount = 4) {
    this.backends = Array.from({ length: backendCount }, (_, i) => ({
      id: `b${i + 1}`,
      label: `Backend ${i + 1}`,
      healthy: true,
      autoMarkedDown: false,
      // Staggered defaults so switching to "weighted" immediately shows something.
      weight: [3, 2, 1, 1][i] ?? 1,
      fault: "none" as Fault,
      activeConnections: 0,
      totalHandled: 0,
      totalErrors: 0,
      consecutiveFailures: 0,
      currentWeight: 0,
    }));
  }

  private addLog(level: LogEntry["level"], message: string) {
    this.log.push({ id: logIdCounter++, time: this.now, level, message });
    if (this.log.length > MAX_LOG_LINES) this.log.shift();
  }

  setAlgorithm(algorithm: Algorithm) {
    this.algorithm = algorithm;
    this.rrCursor = 0;
    this.backends.forEach((b) => (b.currentWeight = 0));
    this.addLog("info", `Algorithm switched to ${algorithm}`);
  }

  setWeight(id: string, weight: number) {
    const backend = this.backends.find((b) => b.id === id);
    if (backend) backend.weight = Math.max(1, Math.min(10, weight));
  }

  toggleHealthy(id: string) {
    const backend = this.backends.find((b) => b.id === id);
    if (!backend) return;

    backend.healthy = !backend.healthy;
    backend.autoMarkedDown = false;

    if (backend.healthy) {
      backend.consecutiveFailures = 0;
      this.addLog("info", `${backend.label} brought back online`);
    } else {
      this.addLog("warn", `${backend.label} taken down manually`);
    }
  }

  setFault(id: string, fault: Fault) {
    const backend = this.backends.find((b) => b.id === id);
    if (!backend) return;
    backend.fault = fault;
    this.addLog("info", `${backend.label} fault set to "${fault}"`);
  }

  setAutoStream(enabled: boolean, rate?: number) {
    this.autoStream = enabled;
    if (rate !== undefined) this.autoStreamRate = rate;
  }

  setDdos(active: boolean) {
    this.ddosActive = active;
    this.addLog(
      active ? "warn" : "info",
      active
        ? "DDoS simulation started — flooding from spoofed source IPs"
        : "DDoS simulation stopped",
    );
  }

  spawnRequest(opts?: { isDdos?: boolean }) {
    if (this.requests.length >= MAX_VISIBLE_REQUESTS) return;

    const isDdos = opts?.isDdos ?? false;
    const clientId = isDdos
      ? `203.0.113.${Math.floor(Math.random() * 254) + 1}`
      : REGULAR_CLIENTS[Math.floor(Math.random() * REGULAR_CLIENTS.length)];

    this.requests.push({
      id: requestIdCounter++,
      clientId,
      path: REQUEST_PATHS[Math.floor(Math.random() * REQUEST_PATHS.length)],
      algorithm: this.algorithm,
      backendId: null,
      phase: "to-lb",
      phaseStart: this.now,
      phaseDuration: TO_LB_MS,
      outcome: null,
      plannedOutcome: null,
      isDdos,
      retryCount: 0,
    });
    this.stats.sent++;
  }

  private pickBackend(clientId: string, path: string, exclude?: string): Backend | null {
    const eligible = this.backends.filter((b) => b.healthy && b.id !== exclude);
    if (eligible.length === 0) return null;

    switch (this.algorithm) {
      case "round-robin": {
        const idx = this.rrCursor % eligible.length;
        this.rrCursor++;
        return eligible[idx];
      }
      case "least-connections": {
        return eligible.reduce((min, b) => (b.activeConnections < min.activeConnections ? b : min));
      }
      case "weighted": {
        let total = 0;
        let selected: Backend | null = null;
        for (const b of eligible) {
          b.currentWeight += b.weight;
          total += b.weight;
          if (!selected || b.currentWeight > selected.currentWeight) selected = b;
        }
        if (selected) selected.currentWeight -= total;
        return selected;
      }
      case "ip-hash": {
        const sorted = [...eligible].sort((a, b) => a.id.localeCompare(b.id));
        return sorted[hashString(clientId) % sorted.length];
      }
      case "url-hash": {
        const sorted = [...eligible].sort((a, b) => a.id.localeCompare(b.id));
        return sorted[hashString(path) % sorted.length];
      }
      case "random": {
        return eligible[Math.floor(Math.random() * eligible.length)];
      }
    }
  }

  private routeRequest(req: RequestPacket) {
    const excludeId = req.retryCount > 0 ? (req.backendId ?? undefined) : undefined;
    const backend = this.pickBackend(req.clientId, req.path, excludeId);

    if (!backend) {
      req.outcome = "rejected";
      req.phase = "returning";
      req.phaseStart = this.now;
      req.phaseDuration = RETURN_MS;
      this.stats.rejected++;
      this.addLog("error", `Request from ${req.clientId} rejected — no healthy backends available`);
      return;
    }

    req.backendId = backend.id;
    backend.activeConnections++;

    const concurrentOnBackend = this.requests.filter(
      (r) => r.id !== req.id && r.backendId === backend.id && (r.phase === "to-backend" || r.phase === "stalled"),
    ).length;

    const isOverloaded = backend.fault === "overloaded" || concurrentOnBackend >= MAX_CONCURRENT_PER_BACKEND;
    const isErroring = !isOverloaded && backend.fault === "erroring" && Math.random() < 0.85;
    const isTimeout = !isOverloaded && !isErroring && backend.fault === "timeout";
    const isSlow = backend.fault === "slow";

    let travelDuration = randomBetween(TO_BACKEND_MIN_MS, TO_BACKEND_MAX_MS);
    if (isSlow) travelDuration *= SLOW_MULTIPLIER;
    if (isOverloaded) travelDuration *= 0.35;

    req.phase = "to-backend";
    req.phaseStart = this.now;
    req.phaseDuration = travelDuration;
    req.plannedOutcome = isOverloaded ? "rejected" : isErroring ? "error" : isTimeout ? "timeout" : "success";
  }

  private resolveArrival(req: RequestPacket) {
    const backend = this.backends.find((b) => b.id === req.backendId);
    if (!backend || !req.plannedOutcome) return;

    if (req.plannedOutcome === "timeout") {
      req.phase = "stalled";
      req.phaseStart = this.now;
      req.phaseDuration = STALL_TIMEOUT_MS;
      return;
    }

    this.finalizeAtBackend(req, backend, req.plannedOutcome);
  }

  private finalizeAtBackend(req: RequestPacket, backend: Backend, outcome: RequestOutcome) {
    backend.activeConnections = Math.max(0, backend.activeConnections - 1);
    backend.totalHandled++;

    if (outcome === "success") {
      backend.consecutiveFailures = 0;
    } else {
      backend.totalErrors++;
      backend.consecutiveFailures++;
      this.maybeAutoDown(backend);
    }

    req.outcome = outcome;
    req.phase = "returning";
    req.phaseStart = this.now;
    req.phaseDuration = RETURN_MS;

    this.stats[outcome]++;

    const clientTag = req.isDdos ? `${req.clientId} (flood)` : req.clientId;
    if (outcome === "error") {
      this.addLog("error", `${backend.label} returned an error for request from ${clientTag}`);
    } else if (outcome === "rejected") {
      this.addLog("error", `${backend.label} refused the connection (overloaded) — request from ${clientTag} dropped`);
    }
  }

  private handleStallTimeout(req: RequestPacket) {
    const backend = this.backends.find((b) => b.id === req.backendId);

    if (backend) {
      backend.activeConnections = Math.max(0, backend.activeConnections - 1);
      backend.totalHandled++;
      backend.totalErrors++;
      backend.consecutiveFailures++;
      this.maybeAutoDown(backend);
    }

    if (req.retryCount === 0 && backend) {
      this.addLog("warn", `${backend.label} timed out on request from ${req.clientId} — LB retrying on another backend`);
      req.retryCount = 1;
      this.routeRequest(req);
    } else {
      if (backend) {
        this.addLog("error", `${backend.label} timed out again — giving up on request from ${req.clientId}`);
      }
      req.outcome = "timeout";
      req.phase = "returning";
      req.phaseStart = this.now;
      req.phaseDuration = RETURN_MS;
      this.stats.timeout++;
    }
  }

  private maybeAutoDown(backend: Backend) {
    if (backend.healthy && backend.consecutiveFailures >= AUTO_DOWN_THRESHOLD) {
      backend.healthy = false;
      backend.autoMarkedDown = true;
      this.addLog(
        "warn",
        `${backend.label} marked unhealthy after ${AUTO_DOWN_THRESHOLD} consecutive failures — removed from rotation`,
      );
    }
  }

  tick(deltaMs: number) {
    this.now += deltaMs;

    if (this.autoStream || this.ddosActive) {
      // Deliberately high enough to push a healthy 4-backend pool toward its
      // organic overload threshold on its own — the point is that no
      // algorithm makes a flood painless, only more or less evenly painful.
      const rate = this.ddosActive ? Math.max(this.autoStreamRate * 10, 40) : this.autoStreamRate;
      this.spawnAccumulator += (rate * deltaMs) / 1000;
      while (this.spawnAccumulator >= 1) {
        this.spawnAccumulator -= 1;
        this.spawnRequest({ isDdos: this.ddosActive });
      }
    }

    for (const req of this.requests) {
      if (req.phase === "done") continue;

      const elapsed = this.now - req.phaseStart;
      if (elapsed < req.phaseDuration) continue;

      switch (req.phase) {
        case "to-lb":
          this.routeRequest(req);
          break;
        case "to-backend":
          this.resolveArrival(req);
          break;
        case "stalled":
          this.handleStallTimeout(req);
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
      backends: this.backends.map((b) => ({ ...b })),
      requests: this.requests.map((r) => ({ ...r })),
      log: [...this.log],
      stats: { ...this.stats },
      autoStream: this.autoStream,
      autoStreamRate: this.autoStreamRate,
      ddosActive: this.ddosActive,
    };
  }
}
