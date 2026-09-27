import { memo } from "react";

import { DISK_READ_MS, SSTABLE_COUNT } from "../_lib/engine";
import type { Batch, Deletion, Op, Seek } from "../_lib/types";

const VIEW_W = 720;
const VIEW_H = 566;

/** Probe rings, trails and the disk head aren't labeled next to them, so each gets a legend entry (§10). */
const LEGEND_ITEMS: { x: number; color: string; label: string; style: "fill" | "ring" | "dashed" | "empty" }[] = [
  { x: 14, color: "var(--accent)", label: "bit = 1", style: "fill" },
  { x: 72, color: "var(--border-strong)", label: "bit = 0", style: "empty" },
  { x: 130, color: "var(--hash-1)", label: "probed by hᵢ", style: "ring" },
  { x: 214, color: "var(--status-up)", label: "0 bit → definitely absent", style: "ring" },
  { x: 346, color: "var(--status-down)", label: "cleared by delete", style: "dashed" },
  { x: 446, color: "var(--status-active)", label: "needed disk read", style: "fill" },
  { x: 552, color: "var(--status-down)", label: "wasted disk seek", style: "fill" },
];
const LEGEND_Y = VIEW_H - 12;

const HASH_COLORS = ["var(--hash-1)", "var(--hash-2)", "var(--hash-3)", "var(--hash-4)", "var(--hash-5)", "var(--hash-6)"];

// ─── Row 1: key → k hashes ──────────────────────────────────────────────
const KEY_BOX = { x: 14, y: 30, w: 156, h: 40 };
const ROWS = { x: 186, y: 28, w: 288, h: 96 };
/** Where each hash row's trail leaves for the bit array. */
const TRAIL_X = ROWS.x + ROWS.w;
const VERDICT = { x: 494, y: 26, w: 212, h: 100 };

// ─── Row 2: the bit array ───────────────────────────────────────────────
const GRID = { x: 48, y: 158, w: 658, h: 262 };
const CELL_GAP = 2;

// ─── Row 3: disk ────────────────────────────────────────────────────────
const DISK_Y = 450;
const TRACK_Y = DISK_Y + 22;
const SST = { x: 48, y: DISK_Y + 38, w: 112, h: 44, gap: 10 };
const METER = { x: 548, y: DISK_Y + 14, w: 158 };

interface GridLayout {
  cols: number;
  rows: number;
  cell: number;
  x0: number;
}

/** 16 columns up to 128 bits, 32 after that; cells shrink to fit but never grow past 34px. */
function gridLayout(m: number): GridLayout {
  const cols = m <= 128 ? 16 : 32;
  const rows = Math.ceil(m / cols);
  const cell = Math.min(34, GRID.w / cols, GRID.h / rows);
  const x0 = GRID.x + (GRID.w - cell * cols) / 2;
  return { cols, rows, cell, x0 };
}

function cellBox(L: GridLayout, i: number) {
  const col = i % L.cols;
  const row = Math.floor(i / L.cols);
  const size = L.cell - CELL_GAP;
  return { x: L.x0 + col * L.cell, y: GRID.y + row * L.cell, size };
}

function sstCenter(index: number) {
  return SST.x + index * (SST.w + SST.gap) + SST.w / 2;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function progress(now: number, start: number, duration: number) {
  return duration <= 0 ? 1 : Math.min(1, Math.max(0, (now - start) / duration));
}

function fit(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Every cell in the array, redrawn only when a bit actually changes — the
 * engine hands back the same `bits` reference otherwise, so 512 rects don't
 * re-render on every animation frame.
 */
const BitGrid = memo(function BitGrid({ bits, m }: { bits: Uint8Array; m: number }) {
  const L = gridLayout(m);
  const showDigits = L.cell >= 20;
  return (
    <g>
      {Array.from({ length: L.rows }, (_, row) => (
        <text
          key={`r${row}`}
          x={L.x0 - 6}
          y={GRID.y + row * L.cell + (L.cell - CELL_GAP) / 2 + 3}
          textAnchor="end"
          fontSize={8}
          className="fill-text-faint font-mono"
        >
          {row * L.cols}
        </text>
      ))}
      {Array.from({ length: m }, (_, i) => {
        const { x, y, size } = cellBox(L, i);
        const on = bits[i] === 1;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={size}
              height={size}
              rx={3}
              fill={on ? "var(--accent)" : "var(--panel-raised)"}
              stroke={on ? "none" : "var(--border)"}
              strokeWidth={0.75}
            />
            {showDigits && (
              <text
                x={x + size / 2}
                y={y + size / 2 + 3.5}
                textAnchor="middle"
                fontSize={9}
                className="font-mono"
                fill={on ? "var(--accent-foreground)" : "var(--text-faint)"}
              >
                {on ? 1 : 0}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});

function rowY(i: number, k: number) {
  const h = Math.min(16, ROWS.h / k);
  return ROWS.y + 8 + i * h;
}

/** How many of the k rows have been revealed so far — they fill in one by one while hashing. */
function rowsShown(op: Op, now: number) {
  if (op.fast || op.phase !== "hashing") return op.probes.length;
  return Math.ceil(progress(now, op.phaseStart, op.phaseDuration) * op.probes.length);
}

function HashRows({ op, now }: { op: Op | null; now: number }) {
  if (!op) {
    return (
      <text x={ROWS.x} y={ROWS.y + 14} fontSize={10} className="fill-text-faint">
        Each hash turns the key into one bit index.
      </text>
    );
  }
  const k = op.probes.length;
  const shown = rowsShown(op, now);
  return (
    <g>
      {op.probes.slice(0, shown).map((p) => {
        const y = rowY(p.hash, k);
        const color = HASH_COLORS[p.hash];
        return (
          <g key={p.hash}>
            <rect x={ROWS.x} y={y - 8} width={20} height={12} rx={3} fill={color} />
            <text x={ROWS.x + 10} y={y + 1} textAnchor="middle" fontSize={8} fontWeight={600} fill="var(--bg)">
              h{p.hash + 1}
            </text>
            <text x={ROWS.x + 28} y={y + 1} fontSize={9.5} className="fill-text-muted font-mono">
              (a + {p.hash}·b) mod {op.m}
            </text>
            <text x={TRAIL_X - 8} y={y + 1} textAnchor="end" fontSize={10} fontWeight={600} className="font-mono" fill={color}>
              → {p.index}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Where trails leave the hashing row, below the verdict panel so they never run underneath it. */
const BUS_Y = VERDICT.y + VERDICT.h + 6;

/**
 * Each trail steps right into its own lane (left of the verdict panel), drops
 * to just under the hashing row, then curves into its cell.
 */
function trailPath(hash: number, from: { x: number; y: number }, to: { x: number; y: number }) {
  const laneX = from.x + 4 + hash * 3;
  return `M ${from.x} ${from.y} L ${laneX} ${from.y} L ${laneX} ${BUS_Y} C ${laneX} ${BUS_Y + 18}, ${to.x} ${BUS_Y}, ${to.x} ${to.y}`;
}

function Trails({ op, now, L }: { op: Op; now: number; L: GridLayout }) {
  if (op.fast || op.phase === "hashing") return null;
  const drawing = op.phase === "to-bits";
  const t = drawing ? easeInOutCubic(progress(now, op.phaseStart, op.phaseDuration)) : 1;
  const k = op.probes.length;
  return (
    <g fill="none">
      {op.probes.map((p) => {
        const c = cellBox(L, p.index);
        const d = trailPath(p.hash, { x: TRAIL_X, y: rowY(p.hash, k) - 2 }, { x: c.x + c.size / 2, y: c.y });
        return (
          <path
            key={p.hash}
            d={d}
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - t}
            stroke={HASH_COLORS[p.hash]}
            strokeWidth={1.5}
            opacity={drawing ? 0.95 : 0.45}
          />
        );
      })}
    </g>
  );
}

/** Rings around the cells the current operation touched, numbered by hash so color is never the only cue. */
function ProbeRings({ op, now, L }: { op: Op; now: number; L: GridLayout }) {
  if (op.phase === "hashing") return null;
  // Rings appear as each trail arrives, not before.
  if (op.phase === "to-bits" && progress(now, op.phaseStart, op.phaseDuration) < 0.9) return null;
  const proofs = op.verdict === "rejected" || op.verdict === "false-negative";
  return (
    <g>
      {op.probes.map((p) => {
        const c = cellBox(L, p.index);
        const color = HASH_COLORS[p.hash];
        const isProof = proofs && p.before === 0;
        return (
          <g key={p.hash}>
            {isProof && (
              <rect
                x={c.x - 4}
                y={c.y - 4}
                width={c.size + 8}
                height={c.size + 8}
                rx={5}
                fill="none"
                stroke={op.verdict === "rejected" ? "var(--status-up)" : "var(--status-down)"}
                strokeWidth={2}
              />
            )}
            <rect
              x={c.x - 1.5}
              y={c.y - 1.5}
              width={c.size + 3}
              height={c.size + 3}
              rx={4}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            <circle cx={c.x + c.size} cy={c.y} r={5.5} fill={color} />
            <text x={c.x + c.size} y={c.y + 2.5} textAnchor="middle" fontSize={7} fontWeight={700} fill="var(--bg)">
              {p.hash + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function ClearedCells({ deletion, L }: { deletion: Deletion; L: GridLayout }) {
  return (
    <g fill="none" stroke="var(--status-down)" strokeWidth={1.75} strokeDasharray="3 2">
      {deletion.cleared.map((i) => {
        const c = cellBox(L, i);
        return <rect key={i} x={c.x - 3} y={c.y - 3} width={c.size + 6} height={c.size + 6} rx={5} />;
      })}
    </g>
  );
}

function VerdictPanel({ op, batch, now }: { op: Op | null; batch: Batch | null; now: number }) {
  let title = "Waiting for a key";
  let color = "var(--text-muted)";
  let lines: string[] = ["Insert sets k bits to 1.", "Check reads the same k bits."];

  if (batch) {
    const r = batch.result;
    title = batch.kind === "query" ? `Querying absent keys… ${r.count}` : `Saturating… ${r.count} keys`;
    color = "var(--status-active)";
    lines =
      batch.kind === "query"
        ? [`${r.rejected} rejected in RAM`, `${r.falsePositives} false positive${r.falsePositives === 1 ? "" : "s"}`]
        : ["Inserting until 90% of bits are 1"];
  } else if (op) {
    const zero = op.probes.find((p) => p.before === 0);
    const k = op.probes.length;
    switch (op.phase) {
      case "hashing":
        title = "Hashing…";
        color = "var(--status-active)";
        lines = [`${k} hash${k === 1 ? "" : "es"} → ${k} bit index${k === 1 ? "" : "es"}`];
        break;
      case "to-bits":
        title = op.kind === "insert" ? "Setting bits…" : op.kind === "delete" ? "Clearing bits…" : "Reading bits…";
        color = "var(--status-active)";
        lines = [`${k} memory reads, no disk`];
        break;
      case "seek": {
        const ms = Math.round(progress(now, op.phaseStart, op.phaseDuration) * DISK_READ_MS);
        title = "Maybe present → disk";
        color = "var(--status-warn)";
        lines = [`All ${k} bits are 1`, `Reading SSTable ${(op.h1 % SSTABLE_COUNT) + 1}… ${ms} ms`];
        break;
      }
      case "done":
        switch (op.verdict) {
          case "added":
            title = "Stored";
            color = "var(--accent)";
            lines = [`${op.probes.filter((p) => p.before === 0).length} of ${k} bits flipped 0 → 1`];
            break;
          case "already-set":
            title = "Stored";
            color = "var(--accent)";
            lines = ["Every bit was already 1 —", "this key changed nothing"];
            break;
          case "rejected":
            title = "✓ Definitely not present";
            color = "var(--status-up)";
            lines = [`Bit ${zero?.index} is 0`, "Disk skipped · 0 ms"];
            break;
          case "true-positive":
            title = "Found on disk";
            color = "var(--status-active)";
            lines = [`Needed read · ${DISK_READ_MS} ms`];
            break;
          case "false-positive":
            title = "✕ FALSE POSITIVE";
            color = "var(--status-down)";
            lines = [`All ${k} bits were 1, key not on disk`, `${DISK_READ_MS} ms seek wasted`];
            break;
          case "false-negative":
            title = "✕ FALSE NEGATIVE";
            color = "var(--status-down)";
            lines = ["Key is stored, but", `bit ${zero?.index} was cleared by a delete`];
            break;
          case "deleted":
            title = "Bits cleared";
            color = "var(--status-warn)";
            lines = ["Other keys may have", "needed those bits"];
            break;
        }
    }
  }

  return (
    <g>
      <rect
        x={VERDICT.x}
        y={VERDICT.y}
        width={VERDICT.w}
        height={VERDICT.h}
        rx={10}
        fill="var(--panel-raised)"
        stroke={color}
        strokeWidth={1.25}
      />
      <text x={VERDICT.x + 12} y={VERDICT.y + 20} fontSize={9} className="fill-text-faint">
        {op && !batch ? `${op.kind.toUpperCase()} "${fit(op.key, 18)}"` : "RESULT"}
      </text>
      <text x={VERDICT.x + 12} y={VERDICT.y + 44} fontSize={13} fontWeight={700} fill={color}>
        {title}
      </text>
      {lines.map((line, i) => (
        <text key={i} x={VERDICT.x + 12} y={VERDICT.y + 64 + i * 15} fontSize={10} className="fill-text-muted">
          {line}
        </text>
      ))}
    </g>
  );
}

function Disk({ seek, op, lastLatencyMs, now }: { seek: Seek | null; op: Op | null; lastLatencyMs: number | null; now: number }) {
  const t = seek ? easeInOutCubic(progress(now, seek.start, seek.duration)) : 0;
  const pos = seek ? seek.from + (seek.to - seek.from) * t : 0;
  const seeking = seek !== null && now < seek.start + seek.duration;
  const wasted = seek?.wasted ?? false;
  const headX = sstCenter(pos);
  const headColor = seeking ? (wasted ? "var(--status-down)" : "var(--status-active)") : "var(--text-faint)";

  // What the last single check found on disk, shown on the SSTable it read.
  const landed = op && !op.fast && op.phase === "done" ? op.verdict : null;
  const readTarget = op ? op.h1 % SSTABLE_COUNT : -1;

  // Latency meter: counts up during a seek, then holds the last value.
  const seekMs = seeking && op?.phase === "seek" ? progress(now, op.phaseStart, op.phaseDuration) * DISK_READ_MS : null;
  const ms = seekMs ?? lastLatencyMs;
  const meterColor =
    ms === null
      ? "var(--text-faint)"
      : ms === 0
        ? "var(--status-up)"
        : wasted
          ? "var(--status-down)"
          : "var(--status-active)";

  return (
    <g>
      <line x1={SST.x} x2={SST.x + SSTABLE_COUNT * (SST.w + SST.gap) - SST.gap} y1={TRACK_Y} y2={TRACK_Y} stroke="var(--border-strong)" strokeDasharray="2 3" />
      {Array.from({ length: SSTABLE_COUNT }, (_, i) => {
        const x = SST.x + i * (SST.w + SST.gap);
        const active = seek !== null && seek.to === i && (seeking || landed === "false-positive" || landed === "true-positive");
        const stroke = active ? (wasted ? "var(--status-down)" : "var(--status-active)") : "var(--border)";
        return (
          <g key={i}>
            <rect x={x} y={SST.y} width={SST.w} height={SST.h} rx={8} fill="var(--panel-raised)" stroke={stroke} strokeWidth={active ? 1.75 : 1} />
            <text x={x + 10} y={SST.y + 18} fontSize={10} fontWeight={600} className="fill-text">
              SSTable {i + 1}
            </text>
            <text x={x + 10} y={SST.y + 33} fontSize={9} className="fill-text-faint">
              {i === readTarget && landed === "false-positive"
                ? "✕ not found"
                : i === readTarget && landed === "true-positive"
                  ? "✓ found"
                  : "sorted, on disk"}
            </text>
          </g>
        );
      })}
      {/* Seek head: an arm down to the track, and the head itself. */}
      <line x1={headX} x2={headX} y1={TRACK_Y - 14} y2={TRACK_Y - 4} stroke={headColor} strokeWidth={2} />
      <path d={`M ${headX - 7} ${TRACK_Y - 5} L ${headX + 7} ${TRACK_Y - 5} L ${headX} ${TRACK_Y + 3} Z`} fill={headColor} />
      <text x={headX + 10} y={TRACK_Y - 8} fontSize={8.5} className="fill-text-faint">
        {seeking ? (wasted ? "seeking (for nothing)" : "seeking") : "read head"}
      </text>

      {/* Latency meter */}
      <text x={METER.x} y={METER.y + 6} fontSize={9} className="fill-text-faint">
        LAST CHECK LATENCY
      </text>
      <text x={METER.x} y={METER.y + 34} fontSize={22} fontWeight={700} className="font-mono" fill={meterColor}>
        {ms === null ? "—" : `${ms.toFixed(ms > 0 && ms < DISK_READ_MS ? 1 : 0)} ms`}
      </text>
      <rect x={METER.x} y={METER.y + 44} width={METER.w} height={8} rx={4} fill="var(--panel-raised)" stroke="var(--border)" />
      {ms !== null && ms > 0 && (
        <rect x={METER.x} y={METER.y + 44} width={(METER.w * Math.min(ms, DISK_READ_MS)) / DISK_READ_MS} height={8} rx={4} fill={meterColor} />
      )}
      <text x={METER.x} y={METER.y + 66} fontSize={9} className="fill-text-faint">
        {ms === 0 ? "answered from RAM (~100 ns)" : ms === null ? "no checks yet" : `one random disk read`}
      </text>
    </g>
  );
}

function RowLabel({ y, n, children }: { y: number; n: number; children: React.ReactNode }) {
  return (
    <text x={14} y={y} fontSize={9.5} fontWeight={600} className="fill-text-faint">
      {n} · {children}
    </text>
  );
}

export function BloomDiagram({
  now,
  m,
  bits,
  setBits,
  op,
  seek,
  batch,
  deletion,
  lastLatencyMs,
}: {
  now: number;
  m: number;
  bits: Uint8Array;
  setBits: number;
  op: Op | null;
  seek: Seek | null;
  batch: Batch | null;
  deletion: Deletion | null;
  lastLatencyMs: number | null;
}) {
  const L = gridLayout(m);
  // An op from before a resize points at indexes the new grid doesn't have.
  const liveOp = op && op.m === m ? op : null;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label={`Bloom filter: ${m}-bit array with ${setBits} bits set, hashing row above and disk-backed SSTables below`}
    >
      {/* Row 1 */}
      <RowLabel y={16} n={1}>KEY → k HASHES (IN MEMORY)</RowLabel>
      <rect x={KEY_BOX.x} y={KEY_BOX.y} width={KEY_BOX.w} height={KEY_BOX.h} rx={8} fill="var(--panel-raised)" stroke="var(--border-strong)" />
      <text x={KEY_BOX.x + 10} y={KEY_BOX.y + 14} fontSize={8.5} className="fill-text-faint">
        key
      </text>
      <text x={KEY_BOX.x + 10} y={KEY_BOX.y + 31} fontSize={12} fontWeight={600} className="fill-text font-mono">
        {liveOp ? fit(liveOp.key, 20) : "—"}
      </text>
      {liveOp && (
        <g className="font-mono" fontSize={9}>
          <text x={KEY_BOX.x} y={KEY_BOX.y + 58} className="fill-text-faint">
            a = {liveOp.h1} (fnv1a)
          </text>
          <text x={KEY_BOX.x} y={KEY_BOX.y + 72} className="fill-text-faint">
            b = {liveOp.h2} (seeded)
          </text>
        </g>
      )}
      <HashRows op={liveOp} now={now} />

      {/* Row 2 */}
      <RowLabel y={146} n={2}>
        {`BIT ARRAY — m = ${m}, ${setBits} set (${Math.round((setBits / m) * 100)}%)`}
      </RowLabel>
      <BitGrid bits={bits} m={m} />
      {deletion && <ClearedCells deletion={deletion} L={L} />}
      {liveOp && <ProbeRings op={liveOp} now={now} L={L} />}
      {liveOp && <Trails op={liveOp} now={now} L={L} />}
      <VerdictPanel op={liveOp} batch={batch} now={now} />

      {/* Row 3 */}
      <line x1={14} x2={VIEW_W - 14} y1={DISK_Y - 16} y2={DISK_Y - 16} stroke="var(--border)" />
      <RowLabel y={DISK_Y} n={3}>DATABASE ON DISK — only reached when the filter says &ldquo;maybe&rdquo;</RowLabel>
      <Disk seek={seek} op={liveOp} lastLatencyMs={lastLatencyMs} now={now} />

      {/* Legend */}
      <g>
        {LEGEND_ITEMS.map((item) => (
          <g key={item.label}>
            <rect
              x={item.x}
              y={LEGEND_Y - 7}
              width={9}
              height={9}
              rx={2}
              fill={item.style === "fill" ? item.color : item.style === "empty" ? "var(--panel-raised)" : "none"}
              stroke={item.style === "fill" ? "none" : item.color}
              strokeWidth={item.style === "empty" ? 1 : 1.75}
              strokeDasharray={item.style === "dashed" ? "2 1.5" : undefined}
            />
            <text x={item.x + 14} y={LEGEND_Y + 1} fontSize={8.5} className="fill-text-faint">
              {item.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
