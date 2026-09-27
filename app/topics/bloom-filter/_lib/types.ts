/**
 * Types for the Bloom filter simulation. Colocated with this topic's route on
 * purpose — the only thing shared with other topics is `lib/hashing.ts`.
 */

export type OpKind = "insert" | "check" | "delete";

/**
 * Where one operation is on screen:
 * hashing (the k rows fill in) → to-bits (trails draw down to the cells) →
 * seek (a "maybe present" check goes to disk) → done (result stays visible).
 */
export type OpPhase = "hashing" | "to-bits" | "seek" | "done";

/**
 * - `added` / `already-set`: an insert that flipped at least one bit, or none (every bit was already 1)
 * - `rejected`: a check that found a 0 bit — definitely absent, disk skipped
 * - `true-positive`: every bit was 1 and the key really is stored, so the disk read was needed
 * - `false-positive`: every bit was 1 but the key was never stored — a wasted disk seek
 * - `false-negative`: a 0 bit on a key that *is* stored — only possible after a delete corrupted the array
 * - `deleted`: a delete attempt cleared the key's bits
 */
export type Verdict =
  | "added"
  | "already-set"
  | "rejected"
  | "true-positive"
  | "false-positive"
  | "false-negative"
  | "deleted";

export interface Probe {
  /** 0-based hash number: this probe came from h(i+1). */
  hash: number;
  index: number;
  /** The bit's value when the probe read it — before an insert set it or a delete cleared it. */
  before: 0 | 1;
}

export interface Op {
  id: number;
  kind: OpKind;
  key: string;
  /** The two base hashes double hashing combines: index_i = (h1 + i·h2) mod m. */
  h1: number;
  h2: number;
  m: number;
  probes: Probe[];
  phase: OpPhase;
  phaseStart: number;
  phaseDuration: number;
  /** Null until the probes land. */
  verdict: Verdict | null;
  /** Batch ops skip the trail animation and just flash their cells. */
  fast: boolean;
}

/** The disk's seek head, gliding from one SSTable to another. */
export interface Seek {
  from: number;
  to: number;
  start: number;
  duration: number;
  /** Whether this read found anything — a false positive's seek is pure waste. */
  wasted: boolean;
}

export type BatchKind = "query" | "saturate";

export interface BatchResult {
  kind: BatchKind;
  /** Keys processed: absent keys queried, or keys inserted. */
  count: number;
  rejected: number;
  falsePositives: number;
  /** Saturation and filter shape at the end of the batch. */
  saturation: number;
  m: number;
  k: number;
  n: number;
}

/** A running "Query 100" or "Saturate" batch. */
export interface Batch {
  kind: BatchKind;
  /** Query: absent keys still to check. Saturate: unused — fresh keys are made until the target is hit. */
  remaining: string[];
  /** Saturate only: stop once this fraction of bits is set. */
  target: number;
  /** Keys processed per batch step, so a big saturate still finishes in a couple of seconds. */
  perStep: number;
  result: BatchResult;
  cooldown: number;
}

export interface Deletion {
  key: string;
  /** Bits that went from 1 to 0. */
  cleared: number[];
  /** How many of the cleared bits some other stored key also depended on. */
  shared: number;
  /** Stored keys that now test "definitely absent" — false negatives the filter promised it would never give. */
  corrupted: string[];
}

export interface FalsePositive {
  key: string;
  probes: Probe[];
  /** 1-in-N chance the theoretical rate gave this happening. */
  expectedRate: number;
}

export interface LogEntry {
  id: number;
  time: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface FilterStats {
  n: number;
  setBits: number;
  saturation: number;
  /** (1 − e^(−kn/m))^k */
  theoreticalFp: number;
  /** Checks rejected in RAM — each one a disk seek that never happened. */
  seeksPrevented: number;
  /** Absent keys checked, and how many of them slipped through anyway. */
  absentChecked: number;
  falsePositives: number;
  /** Simulated disk time: spent on reads that found nothing, and never spent thanks to rejects. */
  diskMsWasted: number;
  diskMsSaved: number;
}

export interface SimSnapshot {
  now: number;
  m: number;
  k: number;
  /** A fresh array whenever any bit changes, and the same reference otherwise — so the grid can skip re-rendering. */
  bits: Uint8Array;
  op: Op | null;
  seek: Seek | null;
  /** Latency the most recent check paid: 0 ms when the filter answered, a disk read otherwise. */
  lastLatencyMs: number | null;
  batch: Batch | null;
  lastBatch: BatchResult | null;
  deletion: Deletion | null;
  falsePositive: FalsePositive | null;
  recentKeys: string[];
  busy: boolean;
  stats: FilterStats;
  log: LogEntry[];
}
