/**
 * Types for the consistent-hashing simulation. Colocated with this topic's
 * route on purpose — the only thing shared with other topics is
 * `lib/hashing.ts`.
 */

export type Mode = "modulo" | "ring";

export type ChangeKind = "kill" | "add" | "resize" | "vnodes";

/** One virtual node: a point on the 2^32 ring owned by a physical node. */
export interface RingPoint {
  pos: number;
  node: number;
  /** Which of that node's virtual nodes this is (0-based). */
  v: number;
}

export interface CacheKey {
  /** Index in the engine's key list — keys are only ever appended, so this is stable until a reset. */
  id: number;
  name: string;
  /** 32-bit position of the key, used by both schemes: `hash % N` and the ring lookup. */
  hash: number;
  /** Physical node that owns the key under the current mode. */
  node: number;
  /** Ring position of the virtual node that owns it (ring mode only; 0 in modulo mode). */
  ownerPos: number;
  /** Bumped when the key lands on a new node, so it goes to the back of that node's column. */
  seq: number;
  /** Position inside its node's column (modulo view), ordered by `seq`. */
  rank: number;
  bornAt: number;
}

/** Where one key was just before a topology change. */
export interface PrevPlacement {
  node: number;
  /** Position inside that node's column (modulo view). */
  rank: number;
  ownerPos: number;
}

/** A topology change animating on screen. */
export interface Transition {
  kind: ChangeKind;
  start: number;
  duration: number;
  prevNodes: number[];
  prevRing: RingPoint[];
  /** Indexed by key id. Keys injected after the change have no entry. */
  prev: PrevPlacement[];
  /** The node that was killed, if any. */
  dead: number | null;
  /** Nodes that just joined. */
  added: number[];
}

export interface ChangeResult {
  kind: ChangeKind;
  mode: Mode;
  fromN: number;
  toN: number;
  total: number;
  moved: number;
  /** Keys that had no choice: their node died. */
  forced: number;
  /** What the other scheme would have moved for the same change (null for a v-node change, which modulo doesn't have). */
  otherMoved: number | null;
  dead: number | null;
  added: number[];
  at: number;
}

export interface NodeLoad {
  id: number;
  keys: number;
  /** Fraction of the hash space this node owns — its expected load. */
  share: number;
}

export interface LogEntry {
  id: number;
  time: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface SimSnapshot {
  now: number;
  mode: Mode;
  /** Alive physical nodes, sorted by id — also the server list `hash % N` indexes into. */
  nodes: number[];
  vnodes: number;
  /** Replaced (never mutated) whenever any key changes, so the diagram can memoize on it. */
  keys: readonly CacheKey[];
  /** Replaced whenever the ring changes. */
  ring: readonly RingPoint[];
  transition: Transition | null;
  lastChange: ChangeResult | null;
  /** The "DATABASE STAMPEDE" warning stays up until this time. */
  stampedeUntil: number;
  loads: NodeLoad[];
  /** Standard deviation of each node's share, as a fraction of the fair share 1/N. */
  imbalance: number;
  log: LogEntry[];
}
