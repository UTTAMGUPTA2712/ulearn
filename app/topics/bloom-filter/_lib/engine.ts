import { hashPair } from "@/lib/hashing";

import type {
  Batch,
  BatchKind,
  Deletion,
  FalsePositive,
  FilterStats,
  LogEntry,
  Op,
  OpKind,
  Probe,
  Seek,
  SimSnapshot,
} from "./types";

export const M_MIN = 64;
export const M_MAX = 512;
export const M_STEP = 64;
export const K_MIN = 1;
/** Six is past the optimum for most of this demo's m/n range, and as many hash colors as stay tell-apart-able. */
export const K_MAX = 6;
/** What one random read costs on a spinning disk — the number every rejected check saves. */
export const DISK_READ_MS = 10;
export const SSTABLE_COUNT = 4;
export const QUERY_BATCH_SIZE = 100;
export const SATURATE_TARGET = 0.9;
export const MAX_KEY_LENGTH = 24;

const HASHING_MS = 420;
const TO_BITS_MS = 520;
/** The seek animation stands in for DISK_READ_MS; slowed down ~90× so the reader can watch it travel. */
const SEEK_MS = 900;
/** A fast (batch) seek, so a burst of false positives still reads as separate trips. */
const FAST_SEEK_MS = 260;
const QUERY_STEP_MS = 30;
const SATURATE_STEP_MS = 25;
/** Saturate aims to finish in about this many steps, however many keys that takes. */
const SATURATE_STEPS = 60;
/** Safety net: k = 1 at m = 512 needs ~1,180 keys to hit 90%, so this is never the real limit. */
const SATURATE_CAP = 4000;
const MAX_LOG_LINES = 60;
const RECENT_KEYS = 6;

let opIdCounter = 0;
let logIdCounter = 0;

/** Indexes for one key, plus the two base hashes they came from (shown in the diagram). */
function indexesFor(key: string, k: number, m: number) {
  const [h1, h2] = hashPair(key);
  // Same arithmetic as `kHashes` in lib/hashing.ts, kept inline so the diagram can show h1 and h2.
  const indexes = Array.from({ length: k }, (_, i) => (h1 + i * h2) % m);
  return { h1, h2, indexes };
}

export function theoreticalFpRate(k: number, n: number, m: number) {
  return Math.pow(1 - Math.exp((-k * n) / m), k);
}

/** "3 in 1,000" style, for rates too small to read as a percentage. */
export function oneIn(rate: number) {
  if (rate <= 0) return "never";
  if (rate >= 0.5) return "about 1 in 2";
  return `about 1 in ${Math.round(1 / rate).toLocaleString("en-US")}`;
}

export function normalizeKey(raw: string) {
  return raw.trim().slice(0, MAX_KEY_LENGTH);
}

/**
 * Owns the whole simulated filter: the bit array, the set of keys actually
 * stored (the "database" — the filter itself never knows this), the one
 * operation on screen, the disk's seek head and the log. Mutated in place on
 * every `tick()`; `getSnapshot()` is the only thing that leaves the engine
 * (see the load-balancer topic's `use-simulation.ts` for why this stays a
 * plain mutable class outside React).
 *
 * An operation's probes are computed the moment it starts, but its effect
 * (bits set, bits cleared, the verdict) only lands when the trails reach
 * the array, so the diagram and the stats never disagree.
 */
export class BloomEngine {
  now = 0;
  m = 128;
  k = 3;
  bits = new Uint8Array(this.m);
  setBits = 0;

  op: Op | null = null;
  seek: Seek | null = null;
  lastLatencyMs: number | null = null;
  batch: Batch | null = null;
  lastBatch: Batch["result"] | null = null;
  deletion: Deletion | null = null;
  falsePositive: FalsePositive | null = null;
  log: LogEntry[] = [];

  seeksPrevented = 0;
  absentChecked = 0;
  falsePositives = 0;
  diskMsWasted = 0;
  diskMsSaved = 0;

  /** Every key actually written to the database — the ground truth the filter is guessing at. */
  private stored = new Set<string>();
  private recent: string[] = [];
  private reducedMotion = false;
  /** Where the seek head rests between reads. */
  private headAt = 0;
  private bitsView = new Uint8Array(this.m);
  private bitsDirty = false;

  private addLog(level: LogEntry["level"], message: string) {
    this.log.push({ id: logIdCounter++, time: this.now, level, message });
    if (this.log.length > MAX_LOG_LINES) this.log.shift();
  }

  private duration(ms: number) {
    return this.reducedMotion ? 0 : ms;
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
  }

  get busy() {
    return this.batch !== null || (this.op !== null && this.op.phase !== "done");
  }

  // ─── Bits ────────────────────────────────────────────────────────────

  private setBit(i: number) {
    if (this.bits[i] === 0) {
      this.bits[i] = 1;
      this.setBits++;
      this.bitsDirty = true;
    }
  }

  private clearBit(i: number) {
    if (this.bits[i] === 1) {
      this.bits[i] = 0;
      this.setBits--;
      this.bitsDirty = true;
    }
  }

  private allSet(indexes: number[]) {
    return indexes.every((i) => this.bits[i] === 1);
  }

  private remember(key: string) {
    this.recent = [key, ...this.recent.filter((k) => k !== key)].slice(0, RECENT_KEYS);
  }

  private writeKey(key: string) {
    for (const i of indexesFor(key, this.k, this.m).indexes) this.setBit(i);
    this.stored.add(key);
  }

  /** Rebuild the array from the stored keys — the only way to change m or k, in a real filter too. */
  private rebuild() {
    this.bits = new Uint8Array(this.m);
    this.setBits = 0;
    this.bitsDirty = true;
    for (const key of this.stored) {
      for (const i of indexesFor(key, this.k, this.m).indexes) this.setBit(i);
    }
    this.op = null;
    this.falsePositive = null;
  }

  saturation() {
    return this.setBits / this.m;
  }

  // ─── Config ──────────────────────────────────────────────────────────

  setM(m: number) {
    const next = Math.min(M_MAX, Math.max(M_MIN, Math.round(m / M_STEP) * M_STEP));
    if (next === this.m || this.busy) return;
    this.m = next;
    this.afterReshape(`m = ${next} bits`);
  }

  setK(k: number) {
    const next = Math.min(K_MAX, Math.max(K_MIN, Math.round(k)));
    if (next === this.k || this.busy) return;
    this.k = next;
    this.afterReshape(`k = ${next} hash${next === 1 ? "" : "es"}`);
  }

  private afterReshape(what: string) {
    const repaired = this.deletion && this.deletion.corrupted.length > 0;
    this.deletion = null;
    this.rebuild();
    if (this.stored.size === 0) {
      this.addLog("info", `Filter reshaped to ${what}`);
      return;
    }
    this.addLog(
      "info",
      `Rebuilt the filter at ${what} by re-hashing all ${this.stored.size} stored keys — a Bloom filter can't be resized in place${
        repaired ? " (which also repaired the delete damage)" : ""
      }`,
    );
  }

  // ─── Keys ────────────────────────────────────────────────────────────

  /** A key that isn't stored: a fresh one for inserts, a guaranteed-absent one for queries. */
  private freshKey(avoid?: Set<string>) {
    for (;;) {
      const key = `user:${10000 + Math.floor(Math.random() * 90000)}`;
      if (!this.stored.has(key) && !avoid?.has(key)) return key;
    }
  }

  // ─── Single operations ───────────────────────────────────────────────

  private startOp(kind: OpKind, key: string) {
    const { h1, h2, indexes } = indexesFor(key, this.k, this.m);
    const probes: Probe[] = indexes.map((index, hash) => ({ hash, index, before: this.bits[index] as 0 | 1 }));
    this.op = {
      id: opIdCounter++,
      kind,
      key,
      h1,
      h2,
      m: this.m,
      probes,
      phase: "hashing",
      phaseStart: this.now,
      phaseDuration: this.duration(HASHING_MS),
      verdict: null,
      fast: false,
    };
    this.falsePositive = null;
    this.remember(key);
  }

  insert(raw = "") {
    if (this.busy) return;
    const key = normalizeKey(raw) || this.freshKey();
    if (this.stored.has(key)) this.addLog("info", `"${key}" is already stored — inserting it again changes nothing`);
    this.startOp("insert", key);
  }

  check(raw = "") {
    if (this.busy) return;
    const key = normalizeKey(raw) || this.freshKey();
    this.startOp("check", key);
  }

  /** Try to remove a key by clearing its bits. With no key given, pick the stored key whose bits are most shared. */
  deleteKey(raw = "") {
    if (this.busy) return;
    let key = normalizeKey(raw);
    if (!key) {
      key = this.mostEntangledKey() ?? "";
      if (!key) {
        this.addLog("warn", "Nothing stored yet — insert a few keys, then try deleting one");
        return;
      }
    } else if (!this.stored.has(key)) {
      this.addLog("warn", `"${key}" isn't stored, so there's nothing to delete`);
      return;
    }
    this.deletion = null;
    this.startOp("delete", key);
  }

  /** The stored key whose bits the most other keys also rely on — the most instructive one to delete. */
  private mostEntangledKey() {
    const users = new Map<number, number>();
    for (const key of this.stored) {
      for (const i of new Set(indexesFor(key, this.k, this.m).indexes)) users.set(i, (users.get(i) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestShared = -1;
    for (const key of this.stored) {
      const shared = [...new Set(indexesFor(key, this.k, this.m).indexes)].filter((i) => (users.get(i) ?? 0) > 1).length;
      if (shared > bestShared) {
        best = key;
        bestShared = shared;
      }
    }
    return best;
  }

  /** Undo the last delete attempt: put the key and its bits back. */
  restoreDeleted() {
    if (!this.deletion || this.busy) return;
    const { key } = this.deletion;
    this.writeKey(key);
    this.deletion = null;
    this.op = null;
    this.addLog(
      "info",
      `Restored "${key}". A real filter couldn't do this — it has no record of which 1s belonged to whom. That's what a counting Bloom filter adds.`,
    );
  }

  reset() {
    this.bits = new Uint8Array(this.m);
    this.setBits = 0;
    this.bitsDirty = true;
    this.stored.clear();
    this.recent = [];
    this.op = null;
    this.seek = null;
    this.headAt = 0;
    this.lastLatencyMs = null;
    this.batch = null;
    this.lastBatch = null;
    this.deletion = null;
    this.falsePositive = null;
    this.seeksPrevented = 0;
    this.absentChecked = 0;
    this.falsePositives = 0;
    this.diskMsWasted = 0;
    this.diskMsSaved = 0;
    this.addLog("info", "Reset — empty filter, empty database");
  }

  // ─── Batches ─────────────────────────────────────────────────────────

  private startBatch(kind: BatchKind, remaining: string[], target: number, perStep: number) {
    this.batch = {
      kind,
      remaining,
      target,
      perStep,
      cooldown: 0,
      result: { kind, count: 0, rejected: 0, falsePositives: 0, saturation: 0, m: this.m, k: this.k, n: 0 },
    };
    this.lastBatch = null;
    this.falsePositive = null;
    this.deletion = null;
    // Reduced motion: no stream of flashing cells, just the result.
    if (this.reducedMotion) {
      while (this.batch) this.batchStep();
    }
  }

  queryAbsent(count = QUERY_BATCH_SIZE) {
    if (this.busy) return;
    const picked = new Set<string>();
    while (picked.size < count) picked.add(this.freshKey(picked));
    this.addLog("info", `Querying ${count} keys that were never inserted`);
    this.startBatch("query", [...picked], 0, 1);
  }

  saturate(target = SATURATE_TARGET) {
    if (this.busy) return;
    if (this.saturation() >= target) {
      this.addLog("info", `Already ${Math.round(this.saturation() * 100)}% saturated`);
      return;
    }
    // Keys needed to reach `target` in expectation: solve 1 − e^(−kn/m) = target for n.
    const needed = Math.max(1, Math.ceil((-this.m / this.k) * Math.log(1 - target)) - this.stored.size);
    this.addLog("info", `Inserting keys until ${Math.round(target * 100)}% of the ${this.m} bits are 1 (≈${needed} keys)`);
    this.startBatch("saturate", [], target, Math.max(1, Math.ceil(needed / SATURATE_STEPS)));
  }

  private batchStep() {
    const batch = this.batch;
    if (!batch) return;
    const r = batch.result;

    for (let i = 0; i < batch.perStep; i++) {
      if (batch.kind === "query") {
        const key = batch.remaining.shift();
        if (key === undefined) break;
        this.fastCheck(key, r);
      } else {
        if (this.saturation() >= batch.target || r.count >= SATURATE_CAP) break;
        this.fastInsert(this.freshKey(), r);
      }
    }

    const finished =
      batch.kind === "query"
        ? batch.remaining.length === 0
        : this.saturation() >= batch.target || r.count >= SATURATE_CAP;
    if (!finished) return;

    r.saturation = this.saturation();
    r.n = this.stored.size;
    this.lastBatch = r;
    this.batch = null;
    if (batch.kind === "query") {
      this.addLog(
        r.falsePositives > 0 ? "warn" : "info",
        `${r.count} absent keys: ${r.rejected} rejected in RAM, ${r.falsePositives} false positive${
          r.falsePositives === 1 ? "" : "s"
        } went to disk`,
      );
    } else {
      this.addLog("warn", `Inserted ${r.count} keys — ${Math.round(r.saturation * 100)}% of bits are now 1`);
    }
  }

  private fastOp(kind: OpKind, key: string): Op {
    const { h1, h2, indexes } = indexesFor(key, this.k, this.m);
    return {
      id: opIdCounter++,
      kind,
      key,
      h1,
      h2,
      m: this.m,
      probes: indexes.map((index, hash) => ({ hash, index, before: this.bits[index] as 0 | 1 })),
      phase: "done",
      phaseStart: this.now,
      phaseDuration: 0,
      verdict: null,
      fast: true,
    };
  }

  private fastInsert(key: string, r: Batch["result"]) {
    const op = this.fastOp("insert", key);
    const before = this.setBits;
    this.writeKey(key);
    op.verdict = this.setBits > before ? "added" : "already-set";
    this.op = op;
    r.count++;
  }

  private fastCheck(key: string, r: Batch["result"]) {
    const op = this.fastOp("check", key);
    r.count++;
    this.absentChecked++;
    if (!this.allSet(op.probes.map((p) => p.index))) {
      op.verdict = "rejected";
      r.rejected++;
      this.seeksPrevented++;
      this.diskMsSaved += DISK_READ_MS;
      this.lastLatencyMs = 0;
    } else {
      op.verdict = "false-positive";
      r.falsePositives++;
      this.falsePositives++;
      this.diskMsWasted += DISK_READ_MS;
      this.lastLatencyMs = DISK_READ_MS;
      this.startSeek(op.h1, true, FAST_SEEK_MS);
      // The banner shows the first one; the rest are counted in the batch summary.
      if (!this.falsePositive) this.recordFalsePositive(op);
    }
    this.op = op;
  }

  // ─── Disk ────────────────────────────────────────────────────────────

  private startSeek(h1: number, wasted: boolean, ms: number) {
    const to = h1 % SSTABLE_COUNT;
    this.seek = { from: this.headPosition(), to, start: this.now, duration: this.duration(ms), wasted };
    this.headAt = to;
  }

  /** Where the head is right now, as a fractional SSTable index — so a seek can start mid-flight. */
  private headPosition() {
    const s = this.seek;
    if (!s || s.duration <= 0) return this.headAt;
    const t = Math.min(1, (this.now - s.start) / s.duration);
    return s.from + (s.to - s.from) * t;
  }

  private recordFalsePositive(op: Op) {
    this.falsePositive = {
      key: op.key,
      probes: op.probes,
      expectedRate: theoreticalFpRate(this.k, this.stored.size, this.m),
    };
  }

  // ─── Tick ────────────────────────────────────────────────────────────

  tick(deltaMs: number) {
    this.now += deltaMs;

    if (this.batch) {
      this.batch.cooldown -= deltaMs;
      while (this.batch && this.batch.cooldown <= 0) {
        this.batch.cooldown += this.batch.kind === "query" ? QUERY_STEP_MS : SATURATE_STEP_MS;
        this.batchStep();
      }
    }

    // Zero-duration phases (reduced motion) cascade through in a single tick.
    const op = this.op;
    while (op && op.phase !== "done" && this.now - op.phaseStart >= op.phaseDuration) {
      this.advance(op);
    }
  }

  private enter(op: Op, phase: Op["phase"], ms: number) {
    op.phase = phase;
    op.phaseStart = this.now;
    op.phaseDuration = this.duration(ms);
  }

  private advance(op: Op) {
    switch (op.phase) {
      case "hashing":
        this.enter(op, "to-bits", TO_BITS_MS);
        return;
      case "to-bits":
        this.land(op);
        return;
      case "seek":
        this.finishSeek(op);
        return;
    }
  }

  /** The trails reached the array: apply the operation and decide its verdict. */
  private land(op: Op) {
    const indexes = op.probes.map((p) => p.index);
    const zeros = op.probes.filter((p) => this.bits[p.index] === 0);

    if (op.kind === "insert") {
      for (const i of indexes) this.setBit(i);
      this.stored.add(op.key);
      op.verdict = zeros.length > 0 ? "added" : "already-set";
      this.addLog(
        "info",
        zeros.length > 0
          ? `Inserted "${op.key}" → bits ${indexes.join(", ")} (${zeros.length} flipped 0→1)`
          : `Inserted "${op.key}" → bits ${indexes.join(", ")} were all 1 already`,
      );
      this.enter(op, "done", 0);
      return;
    }

    if (op.kind === "delete") {
      this.applyDelete(op);
      this.enter(op, "done", 0);
      return;
    }

    // check
    if (zeros.length > 0) {
      if (this.stored.has(op.key)) {
        op.verdict = "false-negative";
        this.addLog("error", `FALSE NEGATIVE: "${op.key}" is stored, but bit ${zeros[0].index} is 0 — a delete cleared it`);
      } else {
        op.verdict = "rejected";
        this.absentChecked++;
        this.seeksPrevented++;
        this.diskMsSaved += DISK_READ_MS;
        this.addLog("info", `"${op.key}": bit ${zeros[0].index} is 0 → definitely absent, disk skipped (0 ms)`);
      }
      this.lastLatencyMs = 0;
      this.enter(op, "done", 0);
      return;
    }

    this.addLog("info", `"${op.key}": all ${op.probes.length} bits are 1 → maybe present, reading from disk`);
    this.startSeek(op.h1, !this.stored.has(op.key), SEEK_MS);
    this.enter(op, "seek", SEEK_MS);
  }

  private finishSeek(op: Op) {
    this.lastLatencyMs = DISK_READ_MS;
    if (this.stored.has(op.key)) {
      op.verdict = "true-positive";
      this.addLog("info", `Disk read found "${op.key}" (${DISK_READ_MS} ms, needed)`);
    } else {
      op.verdict = "false-positive";
      this.absentChecked++;
      this.falsePositives++;
      this.diskMsWasted += DISK_READ_MS;
      this.recordFalsePositive(op);
      this.addLog("error", `FALSE POSITIVE: "${op.key}" was never stored — ${DISK_READ_MS} ms disk seek wasted`);
    }
    this.enter(op, "done", 0);
  }

  private applyDelete(op: Op) {
    const own = new Set(op.probes.map((p) => p.index));
    this.stored.delete(op.key);

    // Which of these bits does some other stored key also rely on?
    const sharedBits = new Set<number>();
    for (const key of this.stored) {
      for (const i of indexesFor(key, this.k, this.m).indexes) if (own.has(i)) sharedBits.add(i);
    }

    const cleared = [...own].filter((i) => this.bits[i] === 1);
    for (const i of cleared) this.clearBit(i);

    const corrupted = [...this.stored].filter((key) => !this.allSet(indexesFor(key, this.k, this.m).indexes));
    this.deletion = { key: op.key, cleared, shared: sharedBits.size, corrupted };
    op.verdict = "deleted";

    if (corrupted.length > 0) {
      this.addLog(
        "error",
        `Deleted "${op.key}" by clearing ${cleared.length} bits — ${corrupted.length} other stored key${
          corrupted.length === 1 ? " now tests" : "s now test"
        } "definitely absent"`,
      );
    } else {
      this.addLog("warn", `Deleted "${op.key}" by clearing ${cleared.length} bits — no other key shared them this time`);
    }
  }

  // ─── Snapshot ────────────────────────────────────────────────────────

  private stats(): FilterStats {
    return {
      n: this.stored.size,
      setBits: this.setBits,
      saturation: this.saturation(),
      theoreticalFp: theoreticalFpRate(this.k, this.stored.size, this.m),
      seeksPrevented: this.seeksPrevented,
      absentChecked: this.absentChecked,
      falsePositives: this.falsePositives,
      diskMsWasted: this.diskMsWasted,
      diskMsSaved: this.diskMsSaved,
    };
  }

  getSnapshot(): SimSnapshot {
    if (this.bitsDirty) {
      this.bitsView = this.bits.slice();
      this.bitsDirty = false;
    }
    return {
      now: this.now,
      m: this.m,
      k: this.k,
      bits: this.bitsView,
      op: this.op ? { ...this.op } : null,
      seek: this.seek,
      lastLatencyMs: this.lastLatencyMs,
      batch: this.batch
        ? { ...this.batch, result: { ...this.batch.result }, remaining: [] }
        : null,
      lastBatch: this.lastBatch,
      deletion: this.deletion,
      falsePositive: this.falsePositive,
      recentKeys: this.recent,
      busy: this.busy,
      stats: this.stats(),
      log: [...this.log],
    };
  }
}
