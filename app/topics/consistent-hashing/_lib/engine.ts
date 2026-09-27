import { fnv1a } from "@/lib/hashing";

import type {
  CacheKey,
  ChangeKind,
  ChangeResult,
  LogEntry,
  Mode,
  NodeLoad,
  PrevPlacement,
  RingPoint,
  SimSnapshot,
  Transition,
} from "./types";

export const MIN_NODES = 3;
export const MAX_NODES = 10;
export const MIN_VNODES = 1;
export const MAX_VNODES = 150;
export const DEFAULT_NODES = 5;
export const DEFAULT_VNODES = 10;
export const INJECT_COUNT = 300;
export const MAX_KEYS = 900;
/** A change that remaps more than this share of the cache counts as a stampede. */
export const STAMPEDE_THRESHOLD = 0.5;

/** How long moving keys take to reach their new node. */
export const MOVE_MS = 1400;
/** How long the remap lines linger after a change, so the reader can take in how many there were. */
export const TRAIL_MS = 4000;
export const STAMPEDE_MS = 5000;
/** Injected keys appear over this long, one after another. */
export const INJECT_SPREAD_MS = 600;
export const FADE_IN_MS = 250;
/** Pause between a scenario setting the stage and the node dying, so the reader sees the "before". */
const SCENARIO_DELAY_MS = 900;
const MAX_LOG_LINES = 60;

/** 2^32 — the size of the hash space both schemes work over. */
export const RING_SIZE = 0x100000000;

let logIdCounter = 0;

/**
 * FNV-1a followed by MurmurHash3's 32-bit finalizer. FNV-1a alone is fine
 * for `hash % N`, but its high bits barely change between inputs that
 * differ only in the last byte ("N0#1", "N0#2"…) — so one node's virtual
 * nodes would bunch up next to each other on the ring instead of spreading
 * out, which is the whole point of having them. The finalizer mixes every
 * input bit into every output bit.
 */
export function ringHash(s: string): number {
  let h = fnv1a(s);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function nodeLabel(id: number) {
  return `N${id}`;
}

const KEY_PREFIXES = ["user", "session", "cart", "feed"];

/** Deterministic, readable cache keys: user:7919, session:15838, … (7919 is prime, so they never repeat below 100,000). */
export function keyName(i: number) {
  return `${KEY_PREFIXES[i % KEY_PREFIXES.length]}:${(i * 7919) % 100000}`;
}

/** Naive sharding: `servers[hash % N]`. */
export function moduloOwner(nodes: readonly number[], hash: number) {
  return nodes[hash % nodes.length];
}

/** Every virtual node of every physical node, sorted by ring position. */
export function buildRing(nodes: readonly number[], vnodes: number): RingPoint[] {
  const ring: RingPoint[] = [];
  for (const node of nodes) {
    for (let v = 0; v < vnodes; v++) ring.push({ pos: ringHash(`${nodeLabel(node)}#vn${v}`), node, v });
  }
  return ring.sort((a, b) => a.pos - b.pos || a.node - b.node);
}

/** The first virtual node at or clockwise after `hash`, wrapping past 2^32 back to the start. Binary search. */
export function ringOwner(ring: readonly RingPoint[], hash: number): RingPoint {
  let lo = 0;
  let hi = ring.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (ring[mid].pos < hash) lo = mid + 1;
    else hi = mid;
  }
  return ring[lo === ring.length ? 0 : lo];
}

/** Fraction of the hash space each node owns. Under modulo that's exactly 1/N; on a ring it's the sum of the arcs ending at its virtual nodes. */
export function nodeShares(mode: Mode, nodes: readonly number[], ring: readonly RingPoint[]) {
  const shares = new Map<number, number>(nodes.map((n) => [n, mode === "modulo" ? 1 / nodes.length : 0]));
  if (mode === "ring") {
    ring.forEach((p, i) => {
      const prev = i === 0 ? ring[ring.length - 1].pos - RING_SIZE : ring[i - 1].pos;
      shares.set(p.node, (shares.get(p.node) ?? 0) + (p.pos - prev) / RING_SIZE);
    });
  }
  return shares;
}

/** Standard deviation of the shares, as a fraction of the fair share 1/N. 0 = perfectly even. */
export function imbalanceOf(shares: Iterable<number>) {
  const list = [...shares];
  const fair = 1 / list.length;
  const variance = list.reduce((sum, s) => sum + (s - fair) ** 2, 0) / list.length;
  return Math.sqrt(variance) / fair;
}

/** How many of `hashes` change node when the cluster goes from one shape to another, under each scheme. */
export function countMoves(
  hashes: readonly number[],
  from: { nodes: readonly number[]; ring: readonly RingPoint[] },
  to: { nodes: readonly number[]; ring: readonly RingPoint[] },
) {
  let modulo = 0;
  let ring = 0;
  for (const h of hashes) {
    if (moduloOwner(from.nodes, h) !== moduloOwner(to.nodes, h)) modulo++;
    if (ringOwner(from.ring, h).node !== ringOwner(to.ring, h).node) ring++;
  }
  return { modulo, ring };
}

const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

/**
 * Owns the simulated cache cluster: which physical nodes are alive, the
 * ring built from their virtual nodes, every cached key and which node owns
 * it, the change currently animating and the log. Mutated in place;
 * `getSnapshot()` is the only thing that leaves the engine (see the
 * load-balancer topic's `use-simulation.ts` for why this stays a plain
 * mutable class outside React).
 *
 * Every topology change is scored under *both* schemes, whichever one is
 * on screen, so the page can always say what the other would have cost.
 */
export class ConsistentHashingEngine {
  now = 0;
  mode: Mode = "modulo";
  nodes: number[] = [];
  vnodes = DEFAULT_VNODES;

  private keys: CacheKey[] = [];
  private keysView: readonly CacheKey[] = [];
  private ring: RingPoint[] = [];
  private transition: Transition | null = null;
  private lastChange: ChangeResult | null = null;
  private stampedeUntil = -1;
  private loads: NodeLoad[] = [];
  private imbalance = 0;
  private log: LogEntry[] = [];
  private seq = 0;
  private reducedMotion = false;
  private scheduled: { at: number; run: () => void } | null = null;

  constructor() {
    this.reset();
  }

  private addLog(level: LogEntry["level"], message: string) {
    this.log.push({ id: logIdCounter++, time: this.now, level, message });
    if (this.log.length > MAX_LOG_LINES) this.log.shift();
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
  }

  tick(deltaMs: number) {
    this.now += deltaMs;
    if (this.transition && this.now - this.transition.start > Math.max(this.transition.duration, TRAIL_MS)) {
      this.transition = null;
    }
    if (this.scheduled && this.now >= this.scheduled.at) {
      const { run } = this.scheduled;
      this.scheduled = null;
      run();
    }
  }

  // ─── Placement ───────────────────────────────────────────────────────

  private place(key: CacheKey) {
    if (this.mode === "modulo") {
      key.node = moduloOwner(this.nodes, key.hash);
      key.ownerPos = 0;
    } else {
      const owner = ringOwner(this.ring, key.hash);
      key.node = owner.node;
      key.ownerPos = owner.pos;
    }
  }

  /** Recompute column ranks, loads and the snapshot's key array after anything moved. */
  private refresh() {
    const byNode = new Map<number, CacheKey[]>();
    for (const key of this.keys) {
      const list = byNode.get(key.node);
      if (list) list.push(key);
      else byNode.set(key.node, [key]);
    }
    for (const list of byNode.values()) {
      list.sort((a, b) => a.seq - b.seq).forEach((key, i) => (key.rank = i));
    }

    const shares = nodeShares(this.mode, this.nodes, this.ring);
    this.loads = this.nodes.map((id) => ({
      id,
      keys: byNode.get(id)?.length ?? 0,
      share: shares.get(id) ?? 0,
    }));
    this.imbalance = imbalanceOf(shares.values());
    this.keysView = this.keys.map((key) => ({ ...key }));
  }

  /**
   * Swap in a new cluster shape. When `kind` is given, the change is scored,
   * logged and animated; without it (reset, scenario setup) keys just
   * quietly move to wherever they belong now.
   */
  private reshape(nextNodes: number[], nextVnodes: number, kind?: ChangeKind, dead: number | null = null) {
    const prevNodes = this.nodes;
    const prevRing = this.ring;
    const prev: PrevPlacement[] = this.keys.map((k) => ({
      node: k.node,
      rank: k.rank,
      ownerPos: k.ownerPos,
    }));
    const added = nextNodes.filter((n) => !prevNodes.includes(n));

    this.nodes = [...nextNodes].sort((a, b) => a - b);
    this.vnodes = nextVnodes;
    this.ring = buildRing(this.nodes, this.vnodes);

    let moved = 0;
    let forced = 0;
    for (const key of this.keys) {
      const before = key.node;
      this.place(key);
      if (key.node !== before) {
        moved++;
        key.seq = this.seq++;
        if (before === dead) forced++;
      }
    }
    this.refresh();

    if (!kind) {
      this.transition = null;
      return;
    }

    const counts = countMoves(
      this.keys.map((k) => k.hash),
      { nodes: prevNodes, ring: prevRing },
      { nodes: this.nodes, ring: this.ring },
    );
    const other = this.mode === "modulo" ? counts.ring : counts.modulo;

    this.transition = {
      kind,
      start: this.now,
      duration: this.reducedMotion ? 0 : MOVE_MS,
      prevNodes,
      prevRing,
      prev,
      dead,
      added,
    };
    this.lastChange = {
      kind,
      mode: this.mode,
      fromN: prevNodes.length,
      toN: this.nodes.length,
      total: this.keys.length,
      moved,
      forced,
      otherMoved: kind === "vnodes" ? null : other,
      dead,
      added,
      at: this.now,
    };

    const total = this.keys.length;
    if (total > 0 && this.mode === "modulo" && moved / total > STAMPEDE_THRESHOLD) {
      this.stampedeUntil = this.now + STAMPEDE_MS;
    }
    this.logChange(this.lastChange);
  }

  private logChange(c: ChangeResult) {
    const scheme = c.mode === "modulo" ? `hash % ${c.toN}` : "the ring";
    const what =
      c.kind === "kill"
        ? `${nodeLabel(c.dead!)} died`
        : c.kind === "add"
          ? `${c.added.map(nodeLabel).join(", ")} joined`
          : c.kind === "resize"
            ? `cluster resized ${c.fromN} → ${c.toN} nodes`
            : `v-nodes set to ${this.vnodes} per node`;

    if (c.total === 0) {
      this.addLog("info", `${what}. No keys cached yet, so nothing moved.`);
      return;
    }

    const share = pct(c.moved, c.total);
    const level =
      c.mode === "modulo" && c.moved / c.total > STAMPEDE_THRESHOLD ? "error" : share > 0 ? "warn" : "info";
    this.addLog(level, `${what}: ${scheme} remapped ${c.moved}/${c.total} keys (${share}%).`);
    if (c.kind === "kill") {
      const needless = c.moved - c.forced;
      this.addLog(
        needless > 0 ? "warn" : "info",
        `  ${c.forced} lived on ${nodeLabel(c.dead!)} and had to move; ${needless} moved off healthy nodes.`,
      );
    }
    if (c.otherMoved !== null) {
      const other = c.mode === "modulo" ? "The ring" : `hash % ${c.toN}`;
      this.addLog("info", `  ${other} would have remapped ${c.otherMoved} (${pct(c.otherMoved, c.total)}%).`);
    }
    if (c.mode === "modulo" && c.moved / c.total > STAMPEDE_THRESHOLD) {
      this.addLog("error", `  ${c.moved} cache misses hit the database at once.`);
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────

  setMode(mode: Mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    for (const key of this.keys) this.place(key);
    this.refresh();
    this.transition = null;
    this.lastChange = null;
    this.stampedeUntil = -1;
    this.addLog(
      "info",
      mode === "ring"
        ? `Switched to the hash ring (${this.nodes.length} nodes × ${this.vnodes} v-nodes).`
        : `Switched to naive modulo: owner = servers[hash % ${this.nodes.length}].`,
    );
  }

  setNodeCount(n: number) {
    const target = Math.min(MAX_NODES, Math.max(MIN_NODES, Math.round(n)));
    if (target === this.nodes.length) return;
    // Grow by filling the lowest free ids; shrink by dropping the highest — like scaling a fleet up or down.
    const next = [...this.nodes];
    for (let id = 0; next.length < target; id++) if (!next.includes(id)) next.push(id);
    next.sort((a, b) => a - b).splice(target);
    this.reshape(next, this.vnodes, "resize");
  }

  addNode() {
    if (this.nodes.length >= MAX_NODES) return;
    let id = 0;
    while (this.nodes.includes(id)) id++;
    this.reshape([...this.nodes, id], this.vnodes, "add");
  }

  killNode(id: number) {
    if (this.nodes.length <= MIN_NODES || !this.nodes.includes(id)) return;
    this.reshape(
      this.nodes.filter((n) => n !== id),
      this.vnodes,
      "kill",
      id,
    );
  }

  killRandomNode() {
    this.killNode(this.nodes[Math.floor(Math.random() * this.nodes.length)]);
  }

  setVnodes(v: number) {
    const target = Math.min(MAX_VNODES, Math.max(MIN_VNODES, Math.round(v)));
    if (target === this.vnodes) return;
    // Modulo has no ring, so the setting is stored for later rather than scored as a change.
    this.reshape(this.nodes, target, this.mode === "ring" ? "vnodes" : undefined);
  }

  injectKeys() {
    const room = Math.min(INJECT_COUNT, MAX_KEYS - this.keys.length);
    if (room <= 0) return;
    const start = this.keys.length;
    for (let i = 0; i < room; i++) {
      const id = start + i;
      const name = keyName(id);
      const key: CacheKey = {
        id,
        name,
        hash: ringHash(name),
        node: 0,
        ownerPos: 0,
        seq: this.seq++,
        rank: 0,
        bornAt: this.reducedMotion ? this.now : this.now + (i / room) * INJECT_SPREAD_MS,
      };
      this.place(key);
      this.keys.push(key);
    }
    this.refresh();
    this.addLog("info", `Cached ${room} keys across ${this.nodes.length} nodes (${this.keys.length} total).`);
  }

  /**
   * One-click version of the headline demo: 5 nodes, 300 keys, then N2 dies.
   * Always the same victim, so running it in both modes compares like with like.
   */
  runKillScenario(mode: Mode) {
    this.scheduled = null;
    this.setMode(mode);
    if (this.nodes.length !== DEFAULT_NODES || !this.nodes.includes(2)) {
      this.reshape([0, 1, 2, 3, 4], this.vnodes);
    }
    if (this.keys.length === 0) this.injectKeys();
    this.transition = null;
    this.lastChange = null;
    this.stampedeUntil = -1;
    this.addLog("info", `Scenario: ${this.nodes.length} healthy nodes, ${this.keys.length} keys. N2 dies next…`);
    this.scheduled = {
      at: this.now + (this.reducedMotion ? 0 : SCENARIO_DELAY_MS),
      run: () => this.killNode(2),
    };
  }

  reset() {
    this.keys = [];
    this.seq = 0;
    this.scheduled = null;
    this.lastChange = null;
    this.stampedeUntil = -1;
    this.nodes = [];
    this.reshape([0, 1, 2, 3, 4].slice(0, DEFAULT_NODES), this.vnodes);
    this.log = [];
    this.addLog("info", `${this.nodes.length} cache nodes up. Inject some keys, then take a node away.`);
  }

  getSnapshot(): SimSnapshot {
    return {
      now: this.now,
      mode: this.mode,
      nodes: this.nodes,
      vnodes: this.vnodes,
      keys: this.keysView,
      ring: this.ring,
      transition: this.transition,
      lastChange: this.lastChange,
      stampedeUntil: this.stampedeUntil,
      loads: this.loads,
      imbalance: this.imbalance,
      log: this.log,
    };
  }
}
