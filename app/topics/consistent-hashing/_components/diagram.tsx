import { useMemo } from "react";

import { FADE_IN_MS, RING_SIZE, TRAIL_MS, nodeLabel } from "../_lib/engine";
import type { CacheKey, Mode, RingPoint, Transition } from "../_lib/types";

const VIEW_W = 720;
const VIEW_H = 470;
const LEGEND_Y = VIEW_H - 14;

type LegendItem = {
  color: string;
  label: string;
  style: "fill" | "ring" | "line" | "dashed";
};

/** Node colors are always printed next to their label; these are the marks that aren't (§10). */
const LEGEND: Record<Mode, LegendItem[]> = {
  modulo: [
    {
      color: "var(--text-faint)",
      label: "cached key (colored by its node)",
      style: "fill",
    },
    {
      color: "var(--status-down)",
      label: "remapped key = cache miss",
      style: "fill",
    },
    {
      color: "var(--status-down)",
      label: "remap: old node → new node",
      style: "line",
    },
    { color: "var(--status-down)", label: "node down", style: "dashed" },
  ],
  ring: [
    {
      color: "var(--text-faint)",
      label: "cached key (colored by its owner)",
      style: "fill",
    },
    { color: "var(--text-faint)", label: "arc owned by a node", style: "line" },
    {
      color: "var(--status-down)",
      label: "keys handed to a new owner",
      style: "line",
    },
    {
      color: "var(--status-down)",
      label: "dead node's old arcs",
      style: "dashed",
    },
  ],
};

export const nodeColor = (id: number) => `var(--node-${id})`;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function progress(now: number, start: number, duration: number) {
  return duration <= 0 ? 1 : Math.min(1, Math.max(0, (now - start) / duration));
}

/** How far the remap lines have faded, 0 (just happened) → 1 (gone). */
function trailFade(now: number, tr: Transition) {
  return progress(now, tr.start, TRAIL_MS);
}

/** Each legend item's x, packed left to right by label length. */
const LEGEND_X: Record<Mode, number[]> = {
  modulo: legendOffsets(LEGEND.modulo),
  ring: legendOffsets(LEGEND.ring),
};

function legendOffsets(items: LegendItem[]) {
  const xs: number[] = [];
  items.reduce((x, item) => (xs.push(x), x + 26 + item.label.length * 4.6), 14);
  return xs;
}

function Legend({ mode }: { mode: Mode }) {
  return (
    <g>
      {LEGEND[mode].map((item, i) => {
        return (
          <g key={item.label} transform={`translate(${LEGEND_X[mode][i]}, ${LEGEND_Y})`}>
            {item.style === "fill" && <rect x={0} y={-3} width={6} height={6} rx={1} fill={item.color} />}
            {item.style === "ring" && (
              <circle cx={3} cy={0} r={3} fill="none" stroke={item.color} strokeWidth={1.2} />
            )}
            {item.style === "line" && <line x1={-2} y1={0} x2={10} y2={0} stroke={item.color} strokeWidth={2} />}
            {item.style === "dashed" && (
              <line x1={-2} y1={0} x2={10} y2={0} stroke={item.color} strokeWidth={2} strokeDasharray="3 2" />
            )}
            <text
              x={item.style === "line" || item.style === "dashed" ? 15 : 10}
              y={3}
              fontSize={8.5}
              className="fill-text-faint"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ─── Modulo view ───────────────────────────────────────────────────────

const COLS = { x: 16, w: VIEW_W - 32, top: 64, bottom: 428, gap: 10 };
type Column = { x: number; w: number; pitch: number };
type Columns = Map<number, Column>;

/**
 * Cells grow as big as they can while an average column, with headroom for
 * the extra keys a kill piles on, still fits — so 300 keys fill the view
 * instead of sitting in a sliver at the bottom.
 */
function pitchFor(w: number, perColumn: number) {
  const height = COLS.bottom - COLS.top - 60;
  for (let p = 14; p > 4; p -= 0.5) {
    const perRow = Math.max(1, Math.floor((w - 8) / p));
    if (Math.ceil(perColumn / perRow) * p <= height) return p;
  }
  return 4;
}

function columnsFor(nodes: readonly number[], keyCount: number): Columns {
  const n = nodes.length;
  const w = (COLS.w - COLS.gap * (n - 1)) / n;
  const pitch = pitchFor(w, (keyCount / n) * 1.5);
  return new Map(nodes.map((id, i) => [id, { x: COLS.x + i * (w + COLS.gap), w, pitch }]));
}

const cellSize = (col: Column) => col.pitch * 0.78;

/** Top-left of the key cell at `rank` in a column. Columns fill from the bottom up, like a bucket. */
function cellAt(col: Column, rank: number) {
  const perRow = Math.max(1, Math.floor((col.w - 8) / col.pitch));
  const row = Math.floor(rank / perRow);
  return {
    x: col.x + 4 + (rank % perRow) * col.pitch,
    y: COLS.bottom - 4 - (row + 1) * col.pitch + (col.pitch - cellSize(col)),
  };
}

function ModuloColumns({
  nodes,
  cols,
  counts,
  opacity,
  dead,
  added,
}: {
  nodes: readonly number[];
  cols: Columns;
  counts: Map<number, number>;
  opacity?: (id: number) => number;
  dead?: number | null;
  added?: number[];
}) {
  return (
    <g>
      {nodes.map((id, i) => {
        const col = cols.get(id)!;
        const isDead = id === dead;
        const isNew = added?.includes(id);
        return (
          <g key={id} opacity={opacity ? opacity(id) : 1}>
            <rect
              x={col.x}
              y={COLS.top}
              width={col.w}
              height={COLS.bottom - COLS.top}
              rx={8}
              className={isDead ? "fill-status-down/10" : "fill-panel-raised/40"}
              stroke={isDead ? "var(--status-down)" : "var(--border)"}
              strokeDasharray={isDead ? "4 3" : undefined}
            />
            <rect x={col.x} y={COLS.top} width={col.w} height={3} rx={1.5} fill={nodeColor(id)} />
            {col.w > 40 && (
              <>
                <text
                  x={col.x + 6}
                  y={COLS.top - 16}
                  fontSize={11}
                  fontWeight={600}
                  fill={nodeColor(id)}
                  className="font-mono"
                >
                  {nodeLabel(id)}
                </text>
                <text x={col.x + 6} y={COLS.top - 5} fontSize={8.5} className="fill-text-faint font-mono">
                  {isDead ? "down" : isNew ? "new" : `[${i}]`} · {isDead ? 0 : (counts.get(id) ?? 0)} keys
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

function ModuloView({
  now,
  nodes,
  keys,
  transition,
  stampede,
  lastMoved,
  reducedMotion,
}: {
  now: number;
  nodes: readonly number[];
  keys: readonly CacheKey[];
  transition: Transition | null;
  stampede: boolean;
  lastMoved: { moved: number; total: number } | null;
  reducedMotion: boolean;
}) {
  const cols = useMemo(() => columnsFor(nodes, keys.length), [nodes, keys.length]);
  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const k of keys) m.set(k.node, (m.get(k.node) ?? 0) + 1);
    return m;
  }, [keys]);

  const fadingIn = keys.length > 0 && keys[keys.length - 1].bornAt + FADE_IN_MS > now;

  // Nothing moving: the whole grid only changes when `keys` or `nodes` do, so don't rebuild it every frame.
  const settled = useMemo(
    () => (
      <g>
        {keys.map((k) => {
          const col = cols.get(k.node)!;
          const p = cellAt(col, k.rank);
          const size = cellSize(col);
          return <rect key={k.id} x={p.x} y={p.y} width={size} height={size} rx={1} fill={nodeColor(k.node)} />;
        })}
      </g>
    ),
    [keys, cols],
  );

  const prevCols = useMemo(
    () => (transition ? columnsFor(transition.prevNodes, transition.prev.length) : null),
    [transition],
  );

  let body: React.ReactNode;
  let columns: React.ReactNode;

  if (transition && prevCols) {
    const t = easeInOutCubic(progress(now, transition.start, transition.duration));
    const fade = trailFade(now, transition);
    // Columns glide from the old layout to the new one; a dead column collapses to nothing, a new one grows from nothing.
    const shown = [...new Set([...transition.prevNodes, ...nodes])].sort((a, b) => a - b);
    const collapsed = (c: Column): Column => ({
      x: c.x + c.w / 2,
      w: 0,
      pitch: c.pitch,
    });
    const liveCols: Columns = new Map(
      shown.map((id) => {
        const a = prevCols.get(id);
        const b = cols.get(id);
        const from = a ?? collapsed(b!);
        const to = b ?? collapsed(a!);
        return [
          id,
          {
            x: lerp(from.x, to.x, t),
            w: lerp(from.w, to.w, t),
            pitch: lerp(from.pitch, to.pitch, t),
          },
        ];
      }),
    );
    columns = (
      <ModuloColumns
        nodes={shown}
        cols={liveCols}
        counts={counts}
        dead={transition.dead}
        added={transition.added}
        opacity={(id) => (!cols.has(id) ? 1 - t : !prevCols.has(id) ? t : 1)}
      />
    );

    const lines: React.ReactNode[] = [];
    const cells: React.ReactNode[] = [];
    for (const k of keys) {
      const toCol = cols.get(k.node)!;
      const to = cellAt(toCol, k.rank);
      const prev = transition.prev[k.id];
      if (!prev) {
        const size = cellSize(toCol);
        cells.push(
          <rect key={k.id} x={to.x} y={to.y} width={size} height={size} rx={1} fill={nodeColor(k.node)} />,
        );
        continue;
      }
      const fromCol = prevCols.get(prev.node)!;
      const from = cellAt(fromCol, prev.rank);
      const size = lerp(cellSize(fromCol), cellSize(toCol), t);
      const x = lerp(from.x, to.x, t);
      const y = lerp(from.y, to.y, t);
      const moved = prev.node !== k.node;
      if (moved && fade < 1) {
        lines.push(
          <line
            key={k.id}
            x1={from.x + size / 2}
            y1={from.y + size / 2}
            x2={x + size / 2}
            y2={y + size / 2}
            stroke="var(--status-down)"
            strokeWidth={0.8}
            opacity={0.55 * (1 - fade)}
          />,
        );
      }
      cells.push(
        <rect
          key={k.id}
          x={x}
          y={y}
          width={size}
          height={size}
          rx={1}
          fill={moved && t < 1 ? "var(--status-down)" : nodeColor(k.node)}
          stroke={moved && fade < 1 ? "var(--status-down)" : undefined}
          strokeWidth={moved ? 1.2 * (1 - fade) : undefined}
        />,
      );
    }
    body = (
      <>
        <g>{lines}</g>
        <g>{cells}</g>
      </>
    );
  } else {
    columns = <ModuloColumns nodes={nodes} cols={cols} counts={counts} />;
    body = fadingIn ? (
      <g>
        {keys.map((k) => {
          const col = cols.get(k.node)!;
          const p = cellAt(col, k.rank);
          const size = cellSize(col);
          const o = progress(now, k.bornAt, FADE_IN_MS);
          return o > 0 ? (
            <rect
              key={k.id}
              x={p.x}
              y={p.y}
              width={size}
              height={size}
              rx={1}
              fill={nodeColor(k.node)}
              opacity={o}
            />
          ) : null;
        })}
      </g>
    ) : (
      settled
    );
  }

  const pulse = reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(now / 140);

  return (
    <g>
      <text x={VIEW_W / 2} y={20} textAnchor="middle" fontSize={11} className="fill-text-muted font-mono">
        owner = servers[ hash(key) % {nodes.length} ]
      </text>
      {columns}
      {body}
      {keys.length === 0 && (
        <text
          x={VIEW_W / 2}
          y={(COLS.top + COLS.bottom) / 2}
          textAnchor="middle"
          fontSize={12}
          className="fill-text-faint"
        >
          No keys cached yet — inject 300 to fill the cluster.
        </text>
      )}
      {stampede && lastMoved && (
        <g opacity={pulse}>
          <rect
            x={VIEW_W / 2 - 190}
            y={COLS.top + 12}
            width={380}
            height={50}
            rx={10}
            className="fill-panel"
            stroke="var(--status-down)"
            strokeWidth={2}
          />
          <text
            x={VIEW_W / 2}
            y={COLS.top + 33}
            textAnchor="middle"
            fontSize={15}
            fontWeight={700}
            letterSpacing={2}
            fill="var(--status-down)"
          >
            DATABASE STAMPEDE
          </text>
          <text x={VIEW_W / 2} y={COLS.top + 51} textAnchor="middle" fontSize={10} className="fill-text-muted">
            {lastMoved.moved} of {lastMoved.total} keys remapped → {lastMoved.moved} cache misses hit the DB at
            once
          </text>
        </g>
      )}
    </g>
  );
}

// ─── Ring view ─────────────────────────────────────────────────────────

const RING = { cx: VIEW_W / 2, cy: 222, r: 170, width: 12 };

function angleOf(pos: number) {
  return (pos / RING_SIZE) * Math.PI * 2;
}

function pointAt(angle: number, r: number) {
  return { x: RING.cx + r * Math.sin(angle), y: RING.cy - r * Math.cos(angle) };
}

/** SVG arc path from angle a to angle b, going clockwise when b > a and counter-clockwise otherwise. */
function arcPath(a: number, b: number, r: number) {
  const p = pointAt(a, r);
  const q = pointAt(b, r);
  const large = Math.abs(b - a) > Math.PI ? 1 : 0;
  const sweep = b > a ? 1 : 0;
  return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
}

/** The arcs each node owns: from the previous v-node (exclusive) up to its own. Neighbouring arcs of the same node merge into one. */
function ownedArcs(ring: readonly RingPoint[]) {
  const arcs: { node: number; from: number; to: number }[] = [];
  ring.forEach((p, i) => {
    const from = i === 0 ? ring[ring.length - 1].pos - RING_SIZE : ring[i - 1].pos;
    const last = arcs[arcs.length - 1];
    if (last && last.node === p.node) last.to = p.pos;
    else arcs.push({ node: p.node, from, to: p.pos });
  });
  return arcs;
}

/** Keys sit in a band just inside the ring; the low hash bits pick the radius so they don't all stack on one line. */
function keyRadius(hash: number) {
  return RING.r - 18 - ((hash & 0xff) / 255) * 30;
}

function RingArcs({ ring, vnodes }: { ring: readonly RingPoint[]; vnodes: number }) {
  const arcs = ownedArcs(ring);
  return (
    <g>
      {arcs.map((a) => (
        <path
          key={`${a.node}-${a.from}`}
          d={arcPath(angleOf(a.from), angleOf(a.to), RING.r)}
          fill="none"
          stroke={nodeColor(a.node)}
          strokeWidth={RING.width}
        />
      ))}
      {ring.length <= 400 &&
        ring.map((p) => {
          const a = angleOf(p.pos);
          const inner = pointAt(a, RING.r + RING.width / 2 + 1);
          const outer = pointAt(a, RING.r + RING.width / 2 + (vnodes === 1 ? 10 : 6));
          return (
            <line
              key={`${p.node}-${p.v}`}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={nodeColor(p.node)}
              strokeWidth={vnodes === 1 ? 2.5 : 1.2}
            />
          );
        })}
      {vnodes === 1 &&
        ring.map((p) => {
          const at = pointAt(angleOf(p.pos), RING.r + 26);
          return (
            <text
              key={`label-${p.node}`}
              x={at.x}
              y={at.y + 4}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill={nodeColor(p.node)}
              className="font-mono"
            >
              {nodeLabel(p.node)}
            </text>
          );
        })}
    </g>
  );
}

function RingView({
  now,
  nodes,
  vnodes,
  keys,
  ring,
  transition,
}: {
  now: number;
  nodes: readonly number[];
  vnodes: number;
  keys: readonly CacheKey[];
  ring: readonly RingPoint[];
  transition: Transition | null;
}) {
  const arcs = useMemo(() => <RingArcs ring={ring} vnodes={vnodes} />, [ring, vnodes]);
  const keyPoints = useMemo(() => keys.map((k) => pointAt(angleOf(k.hash), keyRadius(k.hash))), [keys]);
  const fadingIn = keys.length > 0 && keys[keys.length - 1].bornAt + FADE_IN_MS > now;

  const settledKeys = useMemo(
    () => (
      <g>
        {keys.map((k, i) => (
          <circle key={k.id} cx={keyPoints[i].x} cy={keyPoints[i].y} r={2.2} fill={nodeColor(k.node)} />
        ))}
      </g>
    ),
    [keys, keyPoints],
  );

  let overlay: React.ReactNode = null;
  let keyLayer: React.ReactNode = settledKeys;

  if (transition) {
    const t = easeInOutCubic(progress(now, transition.start, transition.duration));
    const fade = trailFade(now, transition);

    // One trail per (old v-node → new v-node) handover, drawn thicker the more keys took it.
    const handovers = new Map<string, { from: number; to: number; count: number }>();
    for (const k of keys) {
      const prev = transition.prev[k.id];
      if (!prev || prev.node === k.node) continue;
      const id = `${prev.ownerPos}-${k.ownerPos}`;
      const h = handovers.get(id);
      if (h) h.count++;
      else handovers.set(id, { from: prev.ownerPos, to: k.ownerPos, count: 1 });
    }

    const deadArcs =
      transition.dead === null || transition.prevRing.length === 0
        ? []
        : ownedArcs(transition.prevRing).filter((a) => a.node === transition.dead);

    overlay = (
      <g opacity={1 - fade}>
        {deadArcs.map((a) => (
          <path
            key={`dead-${a.from}`}
            d={arcPath(angleOf(a.from), angleOf(a.to), RING.r)}
            fill="none"
            stroke="var(--status-down)"
            strokeWidth={RING.width + 2}
            strokeDasharray="5 3"
          />
        ))}
        {[...handovers.values()].map((h) => {
          const a = angleOf(h.from);
          // A kill hands keys clockwise to the next v-node; a join takes them back counter-clockwise.
          // Anything else (resizing, re-rolling v-nodes) goes the short way round.
          const cw = (((h.to - h.from) % RING_SIZE) + RING_SIZE) % RING_SIZE;
          const ccw = RING_SIZE - cw;
          const kind = transition.kind;
          const clockwise = kind === "kill" ? true : kind === "add" ? false : cw <= ccw;
          const span = angleOf(clockwise ? cw : -ccw);
          const head = a + span * t;
          const r = RING.r - RING.width / 2 - 5;
          const tip = pointAt(head, r);
          return (
            <g key={`${h.from}-${h.to}`}>
              {Math.abs(head - a) > 0.002 && (
                <path
                  d={arcPath(a, head, r)}
                  fill="none"
                  stroke="var(--status-down)"
                  strokeWidth={1.5 + Math.min(h.count, 60) / 8}
                  strokeLinecap="round"
                />
              )}
              <circle cx={tip.x} cy={tip.y} r={3 + Math.min(h.count, 60) / 20} fill="var(--status-down)" />
            </g>
          );
        })}
      </g>
    );

    keyLayer = (
      <g>
        {keys.map((k, i) => {
          const prev = transition.prev[k.id];
          const moved = prev !== undefined && prev.node !== k.node;
          return (
            <circle
              key={k.id}
              cx={keyPoints[i].x}
              cy={keyPoints[i].y}
              r={moved ? 2.6 : 2.2}
              fill={moved && t < 1 ? "var(--status-down)" : nodeColor(k.node)}
              stroke={moved ? "var(--status-down)" : undefined}
              strokeWidth={moved ? 1.2 * (1 - fade) : undefined}
              opacity={prev || !fadingIn ? 1 : progress(now, k.bornAt, FADE_IN_MS)}
            />
          );
        })}
      </g>
    );
  } else if (fadingIn) {
    keyLayer = (
      <g>
        {keys.map((k, i) => {
          const o = progress(now, k.bornAt, FADE_IN_MS);
          return o > 0 ? (
            <circle
              key={k.id}
              cx={keyPoints[i].x}
              cy={keyPoints[i].y}
              r={2.2}
              fill={nodeColor(k.node)}
              opacity={o}
            />
          ) : null;
        })}
      </g>
    );
  }

  const zero = pointAt(0, RING.r + RING.width / 2 + 16);

  return (
    <g>
      <circle cx={RING.cx} cy={RING.cy} r={RING.r} fill="none" stroke="var(--border)" strokeWidth={RING.width} />
      {arcs}
      {overlay}
      {keyLayer}
      <text x={zero.x + 10} y={zero.y - 2} fontSize={8.5} className="fill-text-faint font-mono">
        0 / 2³²
      </text>
      <text x={RING.cx} y={RING.cy - 16} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-text">
        hash ring
      </text>
      <text x={RING.cx} y={RING.cy + 2} textAnchor="middle" fontSize={10} className="fill-text-muted font-mono">
        {nodes.length} nodes × {vnodes} v-node{vnodes === 1 ? "" : "s"}
      </text>
      <text x={RING.cx} y={RING.cy + 18} textAnchor="middle" fontSize={10} className="fill-text-faint">
        {keys.length === 0 ? "inject keys to fill it" : "each key → next v-node clockwise"}
      </text>
    </g>
  );
}

// ─── Diagram ───────────────────────────────────────────────────────────

export function ConsistentHashingDiagram({
  now,
  mode,
  nodes,
  vnodes,
  keys,
  ring,
  transition,
  stampede,
  lastMoved,
  reducedMotion,
}: {
  now: number;
  mode: Mode;
  nodes: readonly number[];
  vnodes: number;
  keys: readonly CacheKey[];
  ring: readonly RingPoint[];
  transition: Transition | null;
  stampede: boolean;
  lastMoved: { moved: number; total: number } | null;
  reducedMotion: boolean;
}) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label={
        mode === "modulo"
          ? `Naive modulo sharding: ${keys.length} keys across ${nodes.length} node columns.`
          : `Consistent hash ring: ${nodes.length} nodes with ${vnodes} virtual nodes each, ${keys.length} keys.`
      }
    >
      {mode === "modulo" ? (
        <ModuloView
          now={now}
          nodes={nodes}
          keys={keys}
          transition={transition}
          stampede={stampede}
          lastMoved={lastMoved}
          reducedMotion={reducedMotion}
        />
      ) : (
        <RingView now={now} nodes={nodes} vnodes={vnodes} keys={keys} ring={ring} transition={transition} />
      )}
      <Legend mode={mode} />
    </svg>
  );
}
