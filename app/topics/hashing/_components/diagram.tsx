import { MOVE_MS, MOVE_STAGGER_MS, TRAIL_MS } from "../_lib/engine";
import { HASH_FNS } from "../_lib/hash-fns";
import type { Flight, HashFnId, LastHash, QueuedOp, Rehash, Strategy, TableEntry, Trail } from "../_lib/types";

const VIEW_W = 720;
const VIEW_H = 470;
const LEGEND_Y = VIEW_H - 14;

/** Token and chip colors aren't labeled next to them, so every one gets a legend entry (§10). */
const LEGEND_ITEMS: { x: number; color: string; label: string; style: "fill" | "ring" | "dashed" }[] = [
  { x: 14, color: "var(--status-active)", label: "key in flight", style: "fill" },
  { x: 104, color: "var(--status-active)", label: "lookup in flight", style: "ring" },
  { x: 206, color: "var(--status-active)", label: "slot reserved", style: "dashed" },
  { x: 300, color: "var(--status-warn)", label: "collision / probed", style: "ring" },
  { x: 410, color: "var(--status-warn)", label: "moved on rehash", style: "fill" },
  { x: 516, color: "var(--status-up)", label: "lookup hit", style: "ring" },
  { x: 600, color: "var(--status-down)", label: "miss / no room", style: "ring" },
];

const LANE = { x: 14, y: 44, w: 72 };
const LANE_CHIP = { w: 72, h: 18, gap: 6 };
const LANE_VISIBLE = 7;
/** The wire (and every token) leaves the lane on its right-hand side, so it never runs through queued keys. */
const LANE_WIRE_X = 100;

const HASH = { x: 116, y: 170, w: 138, h: 124 };
/** Tokens cross the hash box along this line, below the text it shows. */
const HASH_LANE_Y = HASH.y + HASH.h - 20;
const HASH_IN = { x: HASH.x, y: HASH_LANE_Y };
const HASH_OUT = { x: HASH.x + HASH.w, y: HASH_LANE_Y };
/** Center of the front-of-queue chip — where a key's token starts, since it just left that spot. */
const LANE_FRONT = { x: LANE.x + LANE.w / 2, y: LANE.y + 4 + LANE_CHIP.h / 2 };
const TO_HASH_ROUTE = [LANE_FRONT, { x: LANE_WIRE_X, y: LANE_FRONT.y }, { x: LANE_WIRE_X, y: HASH_LANE_Y }, HASH_IN];

const TABLE = { x: 268, y: 44, w: 444, h: 384 };
const INDEX_W = 22;
const CHIP_GAP = 4;
/** Room at the end of a row for a "+12" overflow badge. */
const BADGE_W = 24;

interface Layout {
  m: number;
  rowsPerCol: number;
  rowH: number;
  colW: number;
  chipW: number;
  chipH: number;
  /** How many chain entries fit on a row before the rest collapse into a badge. */
  maxVisible: number;
}

/**
 * Buckets run top to bottom, 16 to a column; bigger tables add columns
 * (m = 32 → 2, m = 64 → 4). Chains grow to the right of their bucket.
 */
function tableLayout(m: number, strategy: Strategy): Layout {
  const rowsPerCol = Math.min(m, 16);
  const cols = Math.ceil(m / rowsPerCol);
  const rowH = Math.min(40, TABLE.h / rowsPerCol);
  const colW = TABLE.w / cols;
  const chipW = cols >= 4 ? 44 : 52;
  const chipH = Math.min(20, rowH - 6);
  const room = colW - INDEX_W - 6 - BADGE_W;
  const maxVisible = strategy === "open-addressing" ? 1 : Math.max(1, Math.floor(room / (chipW + CHIP_GAP)));
  return { m, rowsPerCol, rowH, colW, chipW, chipH, maxVisible };
}

/** Top-left corner of the chip at `depth` in bucket `slot`. Depths past the visible ones pile up on the badge. */
function chipAt(L: Layout, slot: number, depth: number) {
  const col = Math.floor(slot / L.rowsPerCol);
  const row = slot % L.rowsPerCol;
  const d = Math.min(depth, L.maxVisible);
  return {
    x: TABLE.x + col * L.colW + INDEX_W + 6 + d * (L.chipW + CHIP_GAP),
    y: TABLE.y + row * L.rowH + (L.rowH - L.chipH) / 2,
  };
}

function chipCenter(L: Layout, slot: number, depth: number) {
  const p = chipAt(L, slot, depth);
  return { x: p.x + L.chipW / 2, y: p.y + L.chipH / 2 };
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPoint(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/** Position a fraction `t` of the way along a polyline, by length. */
function alongRoute(points: { x: number; y: number }[], t: number) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let remaining = t * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      return lerpPoint(points[i], points[i + 1], lengths[i] ? Math.min(1, remaining / lengths[i]) : 1);
    }
    remaining -= lengths[i];
  }
  return points[points.length - 1];
}

function progress(now: number, start: number, duration: number) {
  return duration <= 0 ? 1 : Math.min(1, Math.max(0, (now - start) / duration));
}

/** Chips are narrow — trim long keys rather than let them spill over the next chip. */
function fit(key: string, chipW: number) {
  const maxChars = Math.floor((chipW - 6) / 5.4);
  return key.length > maxChars ? `${key.slice(0, maxChars - 1)}…` : key;
}

/** Which walk step a probing token is on (moving from step to step + 1), and how far into it. */
function walkStep(f: Flight, now: number) {
  if (f.phase !== "probing" || f.stepMs <= 0) return { step: 0, frac: 0 };
  const steps = Math.round(f.phaseDuration / f.stepMs);
  const raw = Math.min(steps, Math.max(0, (now - f.phaseStart) / f.stepMs));
  const step = Math.min(steps - 1, Math.floor(raw));
  return { step, frac: raw - step };
}

function tokenPosition(f: Flight, now: number, L: Layout, strategy: Strategy) {
  const t = easeInOutCubic(progress(now, f.phaseStart, f.phaseDuration));
  const home = chipCenter(L, f.home, 0);

  switch (f.phase) {
    case "to-hash":
      return alongRoute(TO_HASH_ROUTE, t);
    case "hashing":
      return lerpPoint(HASH_IN, HASH_OUT, t);
    case "to-bucket":
      return lerpPoint(HASH_OUT, home, t);
    case "probing": {
      const { step, frac } = walkStep(f, now);
      const e = easeInOutCubic(frac);
      if (strategy === "chaining") {
        return lerpPoint(chipCenter(L, f.home, step), chipCenter(L, f.home, step + 1), e);
      }
      const from = chipCenter(L, f.path[step] ?? f.home, 0);
      const to = chipCenter(L, f.path[step + 1] ?? f.path[step] ?? f.home, 0);
      return lerpPoint(from, to, e);
    }
    default: {
      // Result: parked where the walk ended.
      if (strategy === "chaining") return chipCenter(L, f.home, f.depth);
      return chipCenter(L, f.slot ?? f.path[f.path.length - 1] ?? f.home, 0);
    }
  }
}

function tokenColor(f: Flight) {
  if (f.phase !== "result") return "var(--status-active)";
  return f.outcome === "hit" ? "var(--status-up)" : "var(--status-down)";
}

/** Slots a token has had to walk past on this trip — lit up while it's still walking. */
function liveProbedSlots(f: Flight, now: number, strategy: Strategy): number[] {
  if (strategy === "chaining") return f.phase === "probing" && f.kind === "insert" && f.collided ? [f.home] : [];
  if (f.phase === "probing") return f.path.length < 2 ? [] : f.path.slice(0, walkStep(f, now).step + 1);
  if (f.phase === "result") return f.outcome === "full" ? f.path : f.path.slice(0, -1);
  return [];
}

function SlotHighlight({ L, slot, opacity }: { L: Layout; slot: number; opacity: number }) {
  const p = chipAt(L, slot, 0);
  return (
    <rect
      x={p.x - 2.5}
      y={p.y - 2.5}
      width={L.chipW + 5}
      height={L.chipH + 5}
      rx={6}
      fill="none"
      stroke="var(--status-warn)"
      strokeWidth={2}
      opacity={opacity}
    />
  );
}

function Token({
  x,
  y,
  L,
  label,
  fill,
  ring,
  outline,
}: {
  x: number;
  y: number;
  L: Layout;
  label: string;
  fill: string;
  /** Lookups travel as an outlined token rather than a filled one. */
  ring?: boolean;
  outline?: string;
}) {
  return (
    <g>
      <rect
        x={x - L.chipW / 2}
        y={y - L.chipH / 2}
        width={L.chipW}
        height={L.chipH}
        rx={4}
        fill={ring ? "var(--panel)" : fill}
        stroke={outline ?? fill}
        strokeWidth={ring || outline ? 2 : 0}
      />
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        fontSize={9}
        className="font-mono"
        fill={ring ? "var(--text)" : "var(--bg)"}
      >
        {fit(label, L.chipW)}
      </text>
    </g>
  );
}

export function HashingDiagram({
  now,
  m,
  strategy,
  hashFn,
  buckets,
  flights,
  trails,
  rehash,
  queue,
  lastHash,
  keyCount,
  reducedMotion,
}: {
  now: number;
  m: number;
  strategy: Strategy;
  hashFn: HashFnId;
  buckets: TableEntry[][];
  flights: Flight[];
  trails: Trail[];
  rehash: Rehash | null;
  queue: QueuedOp[];
  lastHash: LastHash | null;
  keyCount: number;
  reducedMotion: boolean;
}) {
  // While a rehash lifts keys out, the old grid is still drawn; once they start moving, the new one is.
  const gridM = rehash?.phase === "lift" ? rehash.fromM : m;
  const L = tableLayout(gridM, strategy);
  const fromL = rehash ? tableLayout(rehash.fromM, strategy) : L;
  const hashing = flights.some((f) => f.phase === "hashing");
  const shownHash = lastHash && lastHash.hashFn === hashFn ? lastHash : null;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label={`Hash table with ${m} buckets using ${strategy === "chaining" ? "chaining" : "open addressing"} and the ${HASH_FNS[hashFn].label} hash function, holding ${keyCount} keys`}
    >
      {/* Legend */}
      <g fontSize={8.5} className="fill-text-faint">
        {LEGEND_ITEMS.map((item) => (
          <g key={item.label}>
            <rect
              x={item.x}
              y={LEGEND_Y - 4}
              width={10}
              height={8}
              rx={2}
              fill={item.style === "fill" ? item.color : "none"}
              stroke={item.style === "fill" ? "none" : item.color}
              strokeWidth={1.5}
              strokeDasharray={item.style === "dashed" ? "2 1.5" : undefined}
            />
            <text x={item.x + 14} y={LEGEND_Y + 3}>{item.label}</text>
          </g>
        ))}
      </g>

      {/* Static wiring: input lane → hash box → table */}
      <path
        d={`M ${LANE.x + LANE.w} ${LANE_FRONT.y} H ${LANE_WIRE_X} V ${HASH_LANE_Y} H ${HASH_IN.x}`}
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth={1.5}
      />
      <line x1={HASH_OUT.x} y1={HASH_LANE_Y} x2={TABLE.x - 4} y2={HASH_LANE_Y} stroke="var(--border-strong)" strokeWidth={1.5} />

      {/* Input lane */}
      <g>
        <text x={LANE.x + LANE.w / 2} y={LANE.y - 12} textAnchor="middle" fontSize={11} className="fill-text-muted">
          keys in
        </text>
        {queue.length === 0 && (
          <text x={LANE.x + LANE.w / 2} y={LANE.y + 13} textAnchor="middle" fontSize={9} className="fill-text-faint">
            empty
          </text>
        )}
        {queue.slice(0, LANE_VISIBLE).map((op, i) => {
          const y = LANE.y + 4 + i * (LANE_CHIP.h + LANE_CHIP.gap);
          const x = LANE.x + (LANE.w - LANE_CHIP.w) / 2;
          return (
            <g key={`${op.kind}-${op.key}-${i}`}>
              <rect
                x={x}
                y={y}
                width={LANE_CHIP.w}
                height={LANE_CHIP.h}
                rx={4}
                fill="var(--panel-raised)"
                stroke={op.kind === "lookup" ? "var(--status-active)" : "var(--border-strong)"}
                strokeDasharray={op.kind === "lookup" ? "3 2" : undefined}
              />
              <text x={x + LANE_CHIP.w / 2} y={y + 12.5} textAnchor="middle" fontSize={9} className="fill-text font-mono">
                {op.kind === "lookup" ? `find ${fit(op.key, LANE_CHIP.w - 24)}` : fit(op.key, LANE_CHIP.w)}
              </text>
            </g>
          );
        })}
        {queue.length > LANE_VISIBLE && (
          <text
            x={LANE.x + LANE.w / 2}
            y={LANE.y + 16 + LANE_VISIBLE * (LANE_CHIP.h + LANE_CHIP.gap)}
            textAnchor="middle"
            fontSize={9}
            className="fill-text-faint font-mono"
          >
            +{queue.length - LANE_VISIBLE} more
          </text>
        )}
      </g>

      {/* Hash function box */}
      <g>
        <rect
          x={HASH.x}
          y={HASH.y}
          width={HASH.w}
          height={HASH.h}
          rx={14}
          fill="var(--panel-raised)"
          stroke="var(--accent)"
          strokeWidth={hashing ? 2.5 : 1.5}
        />
        <text x={HASH.x + HASH.w / 2} y={HASH.y + 18} textAnchor="middle" fontSize={9} className="fill-text-faint">
          hash function
        </text>
        <text x={HASH.x + HASH.w / 2} y={HASH.y + 36} textAnchor="middle" fontSize={13} fontWeight={600} className="fill-text">
          {HASH_FNS[hashFn].label}
        </text>
        {shownHash ? (
          <g fontSize={9} className="font-mono" textAnchor="middle">
            <text x={HASH.x + HASH.w / 2} y={HASH.y + 56} className="fill-text-muted">
              {HASH_FNS[shownHash.hashFn].formula(fit(shownHash.key, 70))}
            </text>
            <text x={HASH.x + HASH.w / 2} y={HASH.y + 69} className="fill-text-muted">
              = {shownHash.value}
            </text>
            <text x={HASH.x + HASH.w / 2} y={HASH.y + 85} fontWeight={600} className="fill-accent">
              mod {shownHash.m} = {shownHash.index}
            </text>
          </g>
        ) : (
          <text x={HASH.x + HASH.w / 2} y={HASH.y + 66} textAnchor="middle" fontSize={9} className="fill-text-faint">
            key in → bucket index out
          </text>
        )}
      </g>

      {/* Table header */}
      <text x={TABLE.x} y={TABLE.y - 12} fontSize={11} className="fill-text-muted">
        hash table · m = {gridM} · {strategy === "chaining" ? "chaining" : "open addressing"}
      </text>
      {rehash && (
        <text x={TABLE.x + TABLE.w} y={TABLE.y - 12} textAnchor="end" fontSize={11} fontWeight={600} className="fill-status-warn">
          rehashing {rehash.fromM} → {rehash.toM}…
        </text>
      )}

      {/* Buckets: index label plus the first slot, drawn empty; filled chips go on top */}
      {Array.from({ length: gridM }, (_, slot) => {
        const p = chipAt(L, slot, 0);
        return (
          <g key={`slot-${slot}`}>
            <text
              x={p.x - 6}
              y={p.y + L.chipH / 2 + 3}
              textAnchor="end"
              fontSize={9}
              className="fill-text-faint font-mono"
            >
              {slot}
            </text>
            <rect x={p.x} y={p.y} width={L.chipW} height={L.chipH} rx={4} fill="none" stroke="var(--border)" />
          </g>
        );
      })}

      {/* Stored keys (hidden mid-rehash, when every key is drawn as a mover instead) */}
      {!rehash &&
        buckets.map((bucket, slot) => {
          const hidden = bucket.length - L.maxVisible;
          return (
            <g key={`bucket-${slot}`}>
              {bucket.slice(0, L.maxVisible).map((entry, depth) => {
                const p = chipAt(L, slot, depth);
                return (
                  <g key={entry.key}>
                    {depth > 0 && (
                      <line
                        x1={p.x - CHIP_GAP}
                        y1={p.y + L.chipH / 2}
                        x2={p.x}
                        y2={p.y + L.chipH / 2}
                        stroke="var(--border-strong)"
                        strokeWidth={1.5}
                      />
                    )}
                    {entry.landed ? (
                      <>
                        <rect
                          x={p.x}
                          y={p.y}
                          width={L.chipW}
                          height={L.chipH}
                          rx={4}
                          fill="var(--panel-raised)"
                          stroke="var(--border-strong)"
                        />
                        <text
                          x={p.x + L.chipW / 2}
                          y={p.y + L.chipH / 2 + 3}
                          textAnchor="middle"
                          fontSize={9}
                          className="fill-text font-mono"
                        >
                          {fit(entry.key, L.chipW)}
                        </text>
                      </>
                    ) : (
                      <rect
                        x={p.x}
                        y={p.y}
                        width={L.chipW}
                        height={L.chipH}
                        rx={4}
                        fill="none"
                        stroke="var(--status-active)"
                        strokeDasharray="3 2"
                      />
                    )}
                  </g>
                );
              })}
              {hidden > 0 && (
                <text
                  x={chipAt(L, slot, L.maxVisible).x + 2}
                  y={chipAt(L, slot, 0).y + L.chipH / 2 + 3}
                  fontSize={9}
                  fontWeight={600}
                  className="fill-status-warn font-mono"
                >
                  +{hidden}
                </text>
              )}
            </g>
          );
        })}

      {/* Fading trails: collisions and probe paths from recent inserts */}
      {!rehash &&
        trails.flatMap((trail) =>
          trail.slots.map((slot, i) => (
            <SlotHighlight
              key={`trail-${trail.id}-${i}`}
              L={L}
              slot={slot}
              opacity={reducedMotion ? 1 : 1 - (now - trail.at) / TRAIL_MS}
            />
          )),
        )}

      {/* Live probe highlights for tokens still walking */}
      {flights.flatMap((f) =>
        liveProbedSlots(f, now, strategy).map((slot, i) => (
          <SlotHighlight key={`live-${f.id}-${i}`} L={L} slot={slot} opacity={1} />
        )),
      )}

      {/* Keys in flight */}
      {flights.map((f) => {
        const p = tokenPosition(f, now, L, strategy);
        const color = tokenColor(f);
        // Lookups travel outlined; every result (hit, miss, no room) is outlined too, since small
        // labels on a filled status-up/status-down chip don't clear AA contrast in the light theme.
        const outlined = f.kind === "lookup" || f.phase === "result";
        return (
          <Token key={f.id} x={p.x} y={p.y} L={L} label={f.key} fill={color} ring={outlined} outline={outlined ? color : undefined} />
        );
      })}

      {/* Rehash: every key lifts out of the old table and flies to its new bucket */}
      {rehash &&
        rehash.movers.map((mover, i) => {
          const from = chipCenter(fromL, mover.fromSlot, mover.fromDepth);
          const lifted = { x: from.x, y: from.y - 8 };
          if (rehash.phase === "lift") {
            const t = easeInOutCubic(progress(now, rehash.phaseStart, rehash.phaseDuration));
            return (
              <Token key={mover.key} {...lerpPoint(from, lifted, t)} L={fromL} label={mover.key} fill="var(--status-active)" />
            );
          }
          const n = rehash.movers.length;
          const delay = n > 1 ? (i / (n - 1)) * MOVE_STAGGER_MS : 0;
          const t = progress(now, rehash.phaseStart + delay, MOVE_MS);
          const to = chipCenter(L, mover.toSlot, mover.toDepth);
          const p = t < 1 ? lerpPoint(lifted, to, easeInOutCubic(t)) : to;
          const color = mover.moved ? "var(--status-warn)" : "var(--status-active)";
          return t < 1 ? (
            <Token key={mover.key} {...p} L={L} label={mover.key} fill={color} />
          ) : (
            <Token
              key={mover.key}
              {...p}
              L={L}
              label={mover.key}
              fill="var(--panel-raised)"
              ring
              outline={mover.moved ? "var(--status-warn)" : "var(--border-strong)"}
            />
          );
        })}
    </svg>
  );
}
