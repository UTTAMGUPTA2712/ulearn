/**
 * Types for the hashing simulation. Colocated with this topic's route on
 * purpose — the only thing shared with other topics is `lib/hashing.ts`.
 */

export type Strategy = "chaining" | "open-addressing";

/** One good hash and two deliberately bad ones, so the reader can watch what "bad" costs. */
export type HashFnId = "fnv1a" | "first-letter" | "length";

export type FlightKind = "insert" | "lookup";

/**
 * Where a key token is on its trip through the diagram:
 * input lane → hash box → home bucket → (walk the chain / probe forward) → result.
 */
export type FlightPhase = "to-hash" | "hashing" | "to-bucket" | "probing" | "result" | "done";

/** placed/full are insert outcomes; hit/miss are lookup outcomes. */
export type FlightOutcome = "placed" | "full" | "hit" | "miss";

export interface Flight {
  id: number;
  kind: FlightKind;
  key: string;
  /** Raw output of the hash function, before `mod m`. */
  hashValue: number;
  /** hashValue mod m — the bucket the key tries first. */
  home: number;
  /**
   * Slots the token steps through after arriving at `home`, in order.
   * Chaining: always just [home] (the walk happens along the chain instead).
   * Open addressing: home, home+1, … up to the slot where it stopped.
   */
  path: number[];
  /** Chaining only: how many chain entries the token walks past. */
  chainSteps: number;
  /** Final slot, or null when an insert found no room / a lookup missed. */
  slot: number | null;
  /** Position inside that slot's chain (always 0 for open addressing). */
  depth: number;
  /** Key comparisons (chaining) or slot probes (open addressing) this operation cost. */
  comparisons: number;
  /** Home bucket already held something when the token got there. */
  collided: boolean;
  outcome: FlightOutcome;
  phase: FlightPhase;
  phaseStart: number;
  phaseDuration: number;
  /** Per-step duration of the "probing" phase. */
  stepMs: number;
}

export interface TableEntry {
  key: string;
  /** False while the key's token is still flying toward this slot — the slot is reserved but not drawn as filled yet. */
  landed: boolean;
}

/** A fading highlight over slots the last operation had to pass through. */
export interface Trail {
  id: number;
  slots: number[];
  at: number;
}

export interface RehashMover {
  key: string;
  fromSlot: number;
  fromDepth: number;
  toSlot: number;
  toDepth: number;
  /** Landed in a different bucket index than before. */
  moved: boolean;
}

export type RehashReason = "resize" | "hash-fn" | "strategy";

/** Every key lifting out of the old table and flying into the new one. */
export interface Rehash {
  reason: RehashReason;
  fromM: number;
  toM: number;
  phase: "lift" | "move";
  phaseStart: number;
  phaseDuration: number;
  movers: RehashMover[];
}

export interface ResizeResult {
  fromM: number;
  toM: number;
  total: number;
  moved: number;
}

export interface LogEntry {
  id: number;
  time: number;
  level: "info" | "warn" | "error";
  message: string;
}

/** A config change waiting for in-flight tokens to land before the table is rebuilt. */
export interface PendingRebuild {
  m?: number;
  hashFn?: HashFnId;
  strategy?: Strategy;
}

export interface TableStats {
  keys: number;
  loadFactor: number;
  /** Longest chain (chaining) or longest probe sequence (open addressing). */
  longest: number;
  /** Average comparisons a successful lookup would cost, over every stored key. */
  avgComparisons: number;
  /** Largest number of keys sharing one home bucket — the bad-hash symptom. */
  crowdedBucket: number;
}

export interface QueuedOp {
  kind: FlightKind;
  key: string;
}

/** The most recent computation shown inside the hash-function box. */
export interface LastHash {
  key: string;
  hashFn: HashFnId;
  value: number;
  m: number;
  index: number;
}

/**
 * `m`, `strategy` and `hashFn` describe the table as it stands right now.
 * A control that was just clicked may be waiting in `pending` until the
 * tokens in the air land — controls show `pending ?? current` as selected.
 */
export interface SimSnapshot {
  now: number;
  m: number;
  strategy: Strategy;
  hashFn: HashFnId;
  autoResize: boolean;
  autoInsert: boolean;
  insertRate: number;
  buckets: TableEntry[][];
  flights: Flight[];
  trails: Trail[];
  rehash: Rehash | null;
  pending: PendingRebuild | null;
  /** Operations waiting in the input lane. */
  queue: QueuedOp[];
  lastHash: LastHash | null;
  collisions: number;
  lastResize: ResizeResult | null;
  stats: TableStats;
  log: LogEntry[];
}
