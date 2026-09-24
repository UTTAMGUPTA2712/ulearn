import { explainHash, HASH_FNS } from "./hash-fns";
import { ALL_KEYS, CROWDED_KEYS } from "./keys";
import type {
  Flight,
  FlightKind,
  HashFnId,
  LastHash,
  LogEntry,
  PendingRebuild,
  QueuedOp,
  Rehash,
  RehashMover,
  RehashReason,
  ResizeResult,
  SimSnapshot,
  Strategy,
  TableEntry,
  TableStats,
  Trail,
} from "./types";

export const TABLE_SIZES = [8, 16, 32, 64] as const;
/** The largest table this diagram can draw legibly — a real table has no such cap and would keep doubling. */
export const MAX_M = TABLE_SIZES[TABLE_SIZES.length - 1];
/** Java's HashMap default — past this, the table doubles. */
export const LOAD_THRESHOLD = 0.75;
export const BURST_SIZE = 20;

const TO_HASH_MS = 340;
const HASHING_MS = 360;
const TO_BUCKET_MS = 440;
/** Per chain entry / per probe — short enough that a 20-long walk still finishes, long enough to count along. */
const STEP_MS = 180;
/** A pathological walk (a 40-key chain, a full table) is squeezed into this rather than taking 8 seconds. */
const MAX_WALK_MS = 1800;
/** How long a lookup's hit/miss (or a failed insert) stays on screen. */
const RESULT_MS = 900;
/** Gap between queued operations leaving the input lane — a burst plays out as a stream, not one blob. */
const SPAWN_GAP_MS = 260;
export const TRAIL_MS = 1500;
const LIFT_MS = 450;
export const MOVE_MS = 650;
/** Keys leave the old table one after another across this window, so the reader sees each one travel. */
export const MOVE_STAGGER_MS = 700;
/** Auto-insert tops the lane up to this many keys, never more — the lane is a preview, not a backlog. */
const MAX_AUTO_QUEUE = 4;
const OVERFILL_CAP = 48;
const MAX_LOG_LINES = 60;

let flightIdCounter = 0;
let trailIdCounter = 0;
let logIdCounter = 0;

/** Where one operation ends up, worked out the instant its token leaves the input lane. */
interface Plan {
  path: number[];
  chainSteps: number;
  slot: number | null;
  depth: number;
  comparisons: number;
  collided: boolean;
  outcome: Flight["outcome"];
}

function homeIndex(key: string, hashFn: HashFnId, m: number) {
  const value = HASH_FNS[hashFn].compute(key);
  return { value, index: value % m };
}

function planInsert(buckets: TableEntry[][], home: number, strategy: Strategy): Plan {
  const m = buckets.length;
  if (strategy === "chaining") {
    // Walk the whole chain to make sure the key isn't already there, then append.
    const chainLength = buckets[home].length;
    return {
      path: [home],
      chainSteps: chainLength,
      slot: home,
      depth: chainLength,
      comparisons: chainLength,
      collided: chainLength > 0,
      outcome: "placed",
    };
  }

  // Linear probing: home, home+1, home+2, … wrapping around, until a free slot.
  const path: number[] = [];
  for (let i = 0; i < m; i++) {
    const slot = (home + i) % m;
    path.push(slot);
    if (buckets[slot].length === 0) {
      return { path, chainSteps: 0, slot, depth: 0, comparisons: path.length, collided: i > 0, outcome: "placed" };
    }
  }
  return { path, chainSteps: 0, slot: null, depth: 0, comparisons: m, collided: true, outcome: "full" };
}

function planLookup(buckets: TableEntry[][], home: number, key: string, strategy: Strategy): Plan {
  const m = buckets.length;
  if (strategy === "chaining") {
    const chain = buckets[home];
    const depth = chain.findIndex((e) => e.key === key);
    if (depth >= 0) {
      return { path: [home], chainSteps: depth, slot: home, depth, comparisons: depth + 1, collided: false, outcome: "hit" };
    }
    // A miss has to compare against every entry before it can say "not here".
    return {
      path: [home],
      chainSteps: chain.length,
      slot: home,
      depth: chain.length,
      comparisons: chain.length,
      collided: false,
      outcome: "miss",
    };
  }

  const path: number[] = [];
  for (let i = 0; i < m; i++) {
    const slot = (home + i) % m;
    path.push(slot);
    const entry = buckets[slot][0];
    if (!entry) {
      // An empty slot ends the search: the key would have been placed here.
      return { path, chainSteps: 0, slot, depth: 0, comparisons: path.length, collided: false, outcome: "miss" };
    }
    if (entry.key === key) {
      return { path, chainSteps: 0, slot, depth: 0, comparisons: path.length, collided: false, outcome: "hit" };
    }
  }
  return { path, chainSteps: 0, slot: null, depth: 0, comparisons: m, collided: false, outcome: "miss" };
}

/** "5 → 6 → 7 → 8", or "5 → 6 → 7 → … → 46 → 47" once a probe sequence gets long enough to be unreadable in full. */
function describePath(path: number[]): string {
  if (path.length <= 6) return path.join(" → ");
  return [...path.slice(0, 3), "…", ...path.slice(-2)].join(" → ");
}

function emptyBuckets(m: number): TableEntry[][] {
  return Array.from({ length: m }, () => []);
}

/** Smallest table size that keeps `count` keys at or under the load threshold. */
function sizeThatFits(count: number): number {
  return TABLE_SIZES.find((size) => count / size <= LOAD_THRESHOLD) ?? MAX_M;
}

/**
 * Owns the whole simulated hash table: its buckets, the keys waiting in the
 * input lane, the tokens currently flying through the diagram and the log.
 * Mutated in place on every `tick()`; `getSnapshot()` is the only thing that
 * leaves the engine (see the load-balancer topic's `use-simulation.ts` for
 * why this stays a plain mutable class outside React).
 *
 * Every operation's outcome is decided the instant its token leaves the
 * input lane — an insert reserves its slot right then — and the animation
 * just plays that decision out. That's what lets a burst have several
 * tokens in the air at once without two of them claiming the same slot.
 * Anything that rebuilds the table (a resize, a new hash function, a new
 * collision strategy) waits for every token in the air to land first.
 */
export class HashingEngine {
  now = 0;
  m = 16;
  strategy: Strategy = "chaining";
  hashFn: HashFnId = "fnv1a";
  autoResize = true;
  autoInsert = false;
  insertRate = 2;

  buckets: TableEntry[][] = emptyBuckets(this.m);
  flights: Flight[] = [];
  trails: Trail[] = [];
  rehash: Rehash | null = null;
  pending: PendingRebuild | null = null;
  queue: QueuedOp[] = [];
  lastHash: LastHash | null = null;
  collisions = 0;
  lastResize: ResizeResult | null = null;
  log: LogEntry[] = [];

  private reducedMotion = false;
  /** Every stored key in the order it was inserted — a rebuild replays this order. */
  private insertOrder: string[] = [];
  private spawnCooldown = 0;
  private insertAccumulator = 0;
  /** Set once a warning has been logged for the current overload, so it isn't repeated every insert. */
  private overloadWarned = false;
  private outOfKeysWarned = false;

  private addLog(level: LogEntry["level"], message: string) {
    this.log.push({ id: logIdCounter++, time: this.now, level, message });
    if (this.log.length > MAX_LOG_LINES) this.log.shift();
  }

  /** With reduced motion on, every travel phase takes zero time — tokens jump straight to their outcome. */
  private duration(ms: number) {
    return this.reducedMotion ? 0 : ms;
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
  }

  // ─── Config ──────────────────────────────────────────────────────────

  /** The config the table is heading toward — what the controls should show as selected. */
  private target() {
    return {
      m: this.pending?.m ?? this.m,
      hashFn: this.pending?.hashFn ?? this.hashFn,
      strategy: this.pending?.strategy ?? this.strategy,
    };
  }

  private requestRebuild(change: PendingRebuild) {
    this.pending = { ...this.pending, ...change };
  }

  setStrategy(strategy: Strategy) {
    if (strategy === this.target().strategy) return;
    this.requestRebuild({ strategy });
  }

  setHashFn(hashFn: HashFnId) {
    if (hashFn === this.target().hashFn) return;
    this.requestRebuild({ hashFn });
  }

  setSize(m: number) {
    if (m === this.target().m || !TABLE_SIZES.includes(m as (typeof TABLE_SIZES)[number])) return;
    this.requestRebuild({ m });
  }

  /** Double the table — the same thing auto-resize does on its own past the load threshold. */
  resize() {
    const current = this.target().m;
    if (current >= MAX_M) {
      this.addLog("warn", `Already at ${MAX_M} buckets, the largest this demo draws — a real table would keep doubling`);
      return;
    }
    this.requestRebuild({ m: current * 2 });
  }

  setAutoResize(enabled: boolean) {
    this.autoResize = enabled;
    this.addLog("info", `Auto-resize ${enabled ? `on — the table doubles once load passes ${LOAD_THRESHOLD}` : "off"}`);
    if (enabled) this.maybeResize();
  }

  setAutoInsert(enabled: boolean, rate?: number) {
    this.autoInsert = enabled;
    if (rate !== undefined) this.insertRate = rate;
  }

  // ─── Operations ──────────────────────────────────────────────────────

  private freshKeys(count: number, pool: readonly string[]): string[] {
    const taken = new Set([...this.insertOrder, ...this.queue.map((op) => op.key)]);
    const available = pool.filter((k) => !taken.has(k));
    // Partial Fisher–Yates: only shuffle as far as we need.
    for (let i = 0; i < Math.min(count, available.length); i++) {
      const j = i + Math.floor(Math.random() * (available.length - i));
      [available[i], available[j]] = [available[j], available[i]];
    }
    const picked = available.slice(0, count);
    if (picked.length < count && !this.outOfKeysWarned) {
      this.outOfKeysWarned = true;
      this.addLog("warn", "Out of fresh keys to insert — reset to start over");
    }
    return picked;
  }

  private enqueue(kind: FlightKind, keys: string[]) {
    for (const key of keys) this.queue.push({ kind, key });
  }

  insert() {
    this.enqueue("insert", this.freshKeys(1, ALL_KEYS));
  }

  insertBurst(count = BURST_SIZE) {
    this.enqueue("insert", this.freshKeys(count, ALL_KEYS));
  }

  lookup(rawKey: string) {
    const key = rawKey.trim().toLowerCase().slice(0, 16);
    if (key) this.enqueue("lookup", [key]);
  }

  /** "Break it": swap in the first-letter hash, then feed it keys that mostly share a first letter. */
  plugBadHash() {
    this.setHashFn("first-letter");
    // Weighted toward "s" so one chain dominates at every table size, not just where 's' and 'c' share a bucket.
    const sWords = CROWDED_KEYS.filter((k) => k.startsWith("s"));
    const cmWords = CROWDED_KEYS.filter((k) => !k.startsWith("s"));
    const keys = [
      ...this.freshKeys(12, sWords),
      ...this.freshKeys(4, cmWords),
      ...this.freshKeys(4, ALL_KEYS.filter((k) => !CROWDED_KEYS.includes(k))),
    ].sort(() => Math.random() - 0.5);
    this.enqueue("insert", keys);
    this.addLog("warn", `Plugged in the "first letter" hash and queued ${keys.length} keys, mostly starting with s, c or m`);
  }

  /** "Break it": turn auto-resize off and push the load factor well past the threshold. */
  overfill() {
    if (this.autoResize) {
      this.autoResize = false;
      this.addLog("info", "Auto-resize off");
    }
    const { m, strategy } = this.target();
    const stored = this.insertOrder.length + this.queue.filter((op) => op.kind === "insert").length;
    // Open addressing: fill every slot, plus one that has nowhere to go.
    // Chaining never runs out of room, so push it to load 1.5 instead.
    const goal = strategy === "open-addressing" ? m + 1 : Math.ceil(m * 1.5);
    const count = Math.min(OVERFILL_CAP, Math.max(0, goal - stored));
    this.enqueue("insert", this.freshKeys(count, ALL_KEYS));
    this.addLog("warn", `Overfilling: queued ${count} keys into ${m} buckets with auto-resize off`);
  }

  reset() {
    this.buckets = emptyBuckets(this.m);
    this.insertOrder = [];
    this.flights = [];
    this.trails = [];
    this.rehash = null;
    this.queue = [];
    this.lastHash = null;
    this.collisions = 0;
    this.lastResize = null;
    this.autoInsert = false;
    this.overloadWarned = false;
    this.outOfKeysWarned = false;
    this.log = [];
    // A pending size/hash/strategy change is still what the reader asked for — apply it to the empty table.
    if (this.pending) this.startRebuild();
    this.addLog("info", "Table cleared");
  }

  private spawn(op: QueuedOp) {
    const { value, index } = homeIndex(op.key, this.hashFn, this.m);

    const plan =
      op.kind === "insert"
        ? planInsert(this.buckets, index, this.strategy)
        : planLookup(this.buckets, index, op.key, this.strategy);

    if (op.kind === "insert" && plan.slot !== null) {
      this.buckets[plan.slot].push({ key: op.key, landed: false });
      this.insertOrder.push(op.key);
    }

    this.flights.push({
      id: flightIdCounter++,
      kind: op.kind,
      key: op.key,
      hashValue: value,
      home: index,
      ...plan,
      phase: "to-hash",
      phaseStart: this.now,
      phaseDuration: this.duration(TO_HASH_MS),
      stepMs: 0,
    });
  }

  private enterPhase(f: Flight, phase: Flight["phase"], duration: number) {
    f.phaseStart += f.phaseDuration;
    f.phase = phase;
    f.phaseDuration = duration;
  }

  private advance(f: Flight) {
    switch (f.phase) {
      case "to-hash":
        // The hash box shows this key's computation once its token actually reaches the box.
        this.lastHash = { key: f.key, hashFn: this.hashFn, value: f.hashValue, m: this.m, index: f.home };
        this.enterPhase(f, "hashing", this.duration(HASHING_MS));
        break;
      case "hashing":
        this.enterPhase(f, "to-bucket", this.duration(TO_BUCKET_MS));
        break;
      case "to-bucket": {
        const steps = this.strategy === "chaining" ? f.chainSteps : f.path.length - 1;
        f.stepMs = steps > 0 ? Math.min(STEP_MS, MAX_WALK_MS / steps) : 0;
        this.enterPhase(f, "probing", this.duration(steps * f.stepMs));
        break;
      }
      case "probing":
        this.finish(f);
        break;
      case "result":
        this.enterPhase(f, "done", 0);
        break;
    }
  }

  /** The token has reached the end of its walk — apply its outcome. */
  private finish(f: Flight) {
    const verb = this.strategy === "chaining" ? "comparison" : "probe";
    const plural = (n: number) => `${n} ${verb}${n === 1 ? "" : "s"}`;

    if (f.kind === "insert" && f.outcome === "placed" && f.slot !== null) {
      const entry = this.buckets[f.slot].find((e) => e.key === f.key);
      if (entry) entry.landed = true;
      this.enterPhase(f, "done", 0);

      const hash = `${explainHash(this.hashFn, f.key, f.hashValue)}, mod ${this.m} = ${f.home}`;
      if (!f.collided) {
        this.addLog("info", `insert "${f.key}": ${hash} → bucket ${f.home}`);
      } else {
        this.collisions++;
        // Chaining: flash the shared bucket. Open addressing: every taken slot the probe had to pass.
        const slots = this.strategy === "chaining" ? [f.home] : f.path.slice(0, -1);
        this.trails.push({ id: trailIdCounter++, slots, at: this.now });
        if (this.strategy === "chaining") {
          this.addLog("warn", `collision: "${f.key}" → bucket ${f.home} already holds ${f.depth}, appended after ${plural(f.comparisons)}`);
        } else {
          this.addLog("warn", `collision: "${f.key}" → slot ${f.home} taken, probed ${describePath(f.path)} (${plural(f.comparisons)})`);
        }
      }
      this.maybeResize();
      return;
    }

    if (f.kind === "insert") {
      this.trails.push({ id: trailIdCounter++, slots: f.path, at: this.now });
      this.addLog("error", `table full: "${f.key}" probed all ${this.m} slots and found nowhere to go`);
    } else if (f.outcome === "hit") {
      this.addLog("info", `lookup "${f.key}" → hit in ${this.strategy === "chaining" ? "bucket" : "slot"} ${f.slot} after ${plural(f.comparisons)}`);
    } else {
      this.addLog("info", `lookup "${f.key}" → miss after ${plural(f.comparisons)}`);
    }
    this.enterPhase(f, "result", RESULT_MS);
  }

  /** Past the threshold: resize if allowed, otherwise say (once) what's about to go wrong. */
  private maybeResize() {
    const load = this.insertOrder.length / this.m;
    if (load <= LOAD_THRESHOLD) {
      this.overloadWarned = false;
      return;
    }
    if (this.autoResize && this.m < MAX_M) {
      // Usually one doubling; after an overfill, jump straight to the size that fits rather than resizing twice in a row.
      if (this.pending?.m === undefined) this.requestRebuild({ m: sizeThatFits(this.insertOrder.length) });
      return;
    }
    if (this.overloadWarned) return;
    this.overloadWarned = true;
    if (this.autoResize) {
      this.addLog("warn", `Load factor ${load.toFixed(2)} at ${MAX_M} buckets, the largest this demo draws — see the note above the table for what comes next`);
    } else if (this.strategy === "chaining") {
      this.addLog("warn", `Load factor ${load.toFixed(2)} > ${LOAD_THRESHOLD} and auto-resize is off — chains will keep growing`);
    } else {
      this.addLog("warn", `Load factor ${load.toFixed(2)} > ${LOAD_THRESHOLD} and auto-resize is off — probe sequences will keep growing`);
    }
  }

  // ─── Rebuild ─────────────────────────────────────────────────────────

  /** Rehash every stored key into a fresh table under the pending config. */
  private startRebuild() {
    const pending = this.pending ?? {};
    this.pending = null;

    const fromM = this.m;
    let toM = pending.m ?? this.m;
    const hashFn = pending.hashFn ?? this.hashFn;
    const strategy = pending.strategy ?? this.strategy;
    let keys = [...this.insertOrder];

    // Open addressing holds exactly one key per slot, so the table must be at least as big as the key count.
    if (strategy === "open-addressing" && keys.length > toM) {
      const fits = TABLE_SIZES.find((size) => size >= keys.length);
      if (fits !== undefined) {
        this.addLog("warn", `${keys.length} keys can't fit in ${toM} open-addressing slots — using ${fits} instead`);
        toM = fits;
      } else {
        this.addLog("warn", `Only ${MAX_M} slots available — dropped the ${keys.length - MAX_M} newest keys`);
        toM = MAX_M;
        keys = keys.slice(0, MAX_M);
      }
    }

    // With auto-resize on, a table that would start out over the threshold (after shrinking it by hand, say) grows first.
    if (this.autoResize && keys.length / toM > LOAD_THRESHOLD && sizeThatFits(keys.length) > toM) {
      if (pending.m !== undefined && pending.m < this.m) {
        this.addLog("info", `${keys.length} keys in ${pending.m} buckets is over ${LOAD_THRESHOLD} — auto-resize grew it to ${sizeThatFits(keys.length)}`);
      }
      toM = sizeThatFits(keys.length);
    }

    const reason: RehashReason = toM !== fromM ? "resize" : hashFn !== this.hashFn ? "hash-fn" : "strategy";
    if (toM === fromM && hashFn === this.hashFn && strategy === this.strategy) return;

    const from = new Map<string, { slot: number; depth: number }>();
    this.buckets.forEach((bucket, slot) => bucket.forEach((e, depth) => from.set(e.key, { slot, depth })));

    const buckets = emptyBuckets(toM);
    const movers: RehashMover[] = [];
    for (const key of keys) {
      const plan = planInsert(buckets, homeIndex(key, hashFn, toM).index, strategy);
      if (plan.slot === null) continue; // unreachable: toM >= keys.length was ensured above
      buckets[plan.slot].push({ key, landed: true });
      const old = from.get(key) ?? { slot: plan.slot, depth: plan.depth };
      movers.push({
        key,
        fromSlot: old.slot,
        fromDepth: old.depth,
        toSlot: plan.slot,
        toDepth: plan.depth,
        moved: old.slot !== plan.slot,
      });
    }
    const moved = movers.filter((mv) => mv.moved).length;

    this.m = toM;
    this.hashFn = hashFn;
    this.strategy = strategy;
    this.buckets = buckets;
    this.insertOrder = keys;
    this.trails = [];
    this.overloadWarned = false;

    const pct = keys.length ? Math.round((moved / keys.length) * 100) : 0;
    if (reason === "resize") {
      this.lastResize = { fromM, toM, total: keys.length, moved };
      if (keys.length > 0) {
        this.addLog("warn", `resize ${fromM} → ${toM}: rehashed all ${keys.length} keys, ${moved} (${pct}%) changed bucket`);
        this.addLog("info", `Resize moved ${pct}% of keys — imagine these buckets were cache servers → see Consistent Hashing`);
      } else {
        this.addLog("info", `Table size set to ${toM}`);
      }
    } else if (reason === "hash-fn") {
      this.addLog("info", `Hash function → ${HASH_FNS[hashFn].label}${keys.length ? `: rehashed all ${keys.length} keys, ${moved} (${pct}%) changed bucket` : ""}`);
    } else {
      this.addLog("info", `Collision strategy → ${strategy === "chaining" ? "chaining" : "open addressing"}${keys.length ? `: rebuilt the table from all ${keys.length} keys` : ""}`);
    }

    this.rehash =
      keys.length > 0 && !this.reducedMotion
        ? { reason, fromM, toM, phase: "lift", phaseStart: this.now, phaseDuration: LIFT_MS, movers }
        : null;
    this.maybeResize();
  }

  // ─── Loop ────────────────────────────────────────────────────────────

  tick(deltaMs: number) {
    this.now += deltaMs;
    this.trails = this.trails.filter((t) => this.now - t.at < TRAIL_MS);

    if (this.autoInsert) {
      this.insertAccumulator += (this.insertRate * deltaMs) / 1000;
      while (this.insertAccumulator >= 1) {
        this.insertAccumulator -= 1;
        if (this.queue.length < MAX_AUTO_QUEUE) this.insert();
      }
    }

    if (this.rehash && this.now - this.rehash.phaseStart >= this.rehash.phaseDuration) {
      if (this.rehash.phase === "lift") {
        this.rehash.phaseStart += this.rehash.phaseDuration;
        this.rehash.phase = "move";
        this.rehash.phaseDuration = MOVE_MS + MOVE_STAGGER_MS;
      } else {
        this.rehash = null;
      }
    }

    // A rebuild waits for every token in the air to land, then pre-empts any rehash still animating.
    if (this.pending && this.flights.length === 0) {
      this.startRebuild();
    } else if (!this.pending && !this.rehash) {
      this.spawnCooldown -= deltaMs;
      if (this.spawnCooldown <= 0 && this.queue.length > 0) {
        this.spawn(this.queue.shift()!);
        this.spawnCooldown = SPAWN_GAP_MS;
      }
    }

    for (const f of this.flights) {
      // `while`, not `if`: under reduced motion every phase lasts 0ms and should all resolve this frame.
      while (f.phase !== "done" && this.now - f.phaseStart >= f.phaseDuration) this.advance(f);
    }
    this.flights = this.flights.filter((f) => f.phase !== "done");
  }

  private computeStats(): TableStats {
    let keys = 0;
    let longest = 0;
    let totalCost = 0;
    const perHome = new Array<number>(this.m).fill(0);

    this.buckets.forEach((bucket, slot) => {
      bucket.forEach((entry, depth) => {
        if (!entry.landed) return;
        keys++;
        const home = homeIndex(entry.key, this.hashFn, this.m).index;
        perHome[home]++;
        // Cost of finding this key again: its chain position, or how far it was pushed from home.
        const cost = this.strategy === "chaining" ? depth + 1 : ((slot - home + this.m) % this.m) + 1;
        totalCost += cost;
        longest = Math.max(longest, this.strategy === "chaining" ? depth + 1 : cost);
      });
    });

    return {
      keys,
      loadFactor: keys / this.m,
      longest,
      avgComparisons: keys ? totalCost / keys : 0,
      crowdedBucket: Math.max(0, ...perHome),
    };
  }

  getSnapshot(): SimSnapshot {
    return {
      now: this.now,
      m: this.m,
      strategy: this.strategy,
      hashFn: this.hashFn,
      autoResize: this.autoResize,
      autoInsert: this.autoInsert,
      insertRate: this.insertRate,
      buckets: this.buckets.map((bucket) => bucket.map((e) => ({ ...e }))),
      flights: this.flights.map((f) => ({ ...f })),
      trails: this.trails.map((t) => ({ ...t })),
      rehash: this.rehash ? { ...this.rehash } : null,
      pending: this.pending ? { ...this.pending } : null,
      queue: this.queue.map((op) => ({ ...op })),
      lastHash: this.lastHash ? { ...this.lastHash } : null,
      collisions: this.collisions,
      lastResize: this.lastResize ? { ...this.lastResize } : null,
      stats: this.computeStats(),
      log: [...this.log],
    };
  }
}
