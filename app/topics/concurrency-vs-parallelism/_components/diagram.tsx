import type { GilState, Mode, Task } from "../_lib/types";

const VIEW_W = 720;
const VIEW_H = 420;
const GIL_STRIP_H = 48;
const IO_TRAY_H = 46;
const QUEUE_TRAY_H = 46;
const LANE_X = 20;
const LANE_W = VIEW_W - LANE_X * 2;
const LANE_AREA_Y = GIL_STRIP_H;
const LANE_AREA_H = VIEW_H - GIL_STRIP_H - IO_TRAY_H - QUEUE_TRAY_H;
const LANE_GAP = 6;
const CHIP_W = 40;

function legFraction(task: Task): number {
  const leg = task.legs[task.legIndex];
  if (!leg) return 1;
  return Math.min(1, Math.max(0, 1 - task.legRemainingMs / leg.durationMs));
}

/** The GIL, made literal — a small padlock glyph, not just a color. */
function PadlockIcon({ color }: { color: string }) {
  return (
    <g>
      <path d="M -4 -1 v -3 a 4 4 0 0 1 8 0 v 3" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <rect x={-5.5} y={-1} width={11} height={8} rx={2} fill={color} />
    </g>
  );
}

function TaskChip({ task, x, y }: { task: Task; x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-16} y={-9} width={32} height={18} rx={5} fill="var(--panel-raised)" stroke="var(--border-strong)" />
      <text textAnchor="middle" y={4} fontSize={9} className="fill-text-muted font-mono">
        T{task.id}
      </text>
    </g>
  );
}

/** A row of task chips that overflow gracefully instead of running off the diagram. */
function ChipRow({ tasks, y }: { tasks: Task[]; y: number }) {
  const maxChips = Math.max(1, Math.floor((LANE_W - 20) / CHIP_W));
  const shown = tasks.slice(0, maxChips);
  const overflow = tasks.length - shown.length;
  return (
    <>
      {shown.map((t, i) => (
        <TaskChip key={t.id} task={t} x={LANE_X + 20 + i * CHIP_W} y={y} />
      ))}
      {overflow > 0 && (
        <text x={LANE_X + 20 + shown.length * CHIP_W} y={y + 4} fontSize={9} className="fill-text-faint font-mono">
          +{overflow} more
        </text>
      )}
    </>
  );
}

function TaskLane({ task, x, y, width, height }: { task: Task | undefined; x: number; y: number; width: number; height: number }) {
  if (!task) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={8} fill="var(--panel-raised)" stroke="var(--border)" />
        <text x={x + 10} y={y + height / 2 + 4} fontSize={10} className="fill-text-faint">
          idle
        </text>
      </g>
    );
  }

  const fraction = legFraction(task);
  const isSpawning = task.status === "spawning";

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={8} fill="var(--panel-raised)" stroke="var(--accent)" strokeWidth={1.5} />
      {!isSpawning && (
        <rect
          x={x}
          y={y + height - 5}
          width={Math.max(3, width * fraction)}
          height={5}
          rx={2.5}
          fill="var(--status-up)"
          className="transition-[width] duration-300 ease-in-out"
        />
      )}
      {isSpawning && (
        <rect x={x} y={y} width={width} height={height} rx={8} fill="none" stroke="var(--text-faint)" strokeDasharray="4 3" className="animate-pulse" />
      )}
      <text x={x + 10} y={y + height / 2 + 4} fontSize={11} fontWeight={600} className="fill-text font-mono">
        {isSpawning ? `T${task.id} · spawning…` : `T${task.id}`}
      </text>
    </g>
  );
}

export function ConcurrencyDiagram({
  mode,
  coreCount,
  tasks,
  gil,
  coreBusyPct,
  reducedMotion,
}: {
  mode: Mode;
  coreCount: number;
  tasks: Task[];
  gil: GilState;
  /** Per-core busy% over the run so far — see `SimSnapshot.coreBusyPct`. Makes an I/O-bound process idling on a dedicated core visible as a low number, not just a guess. */
  coreBusyPct: number[];
  reducedMotion: boolean;
}) {
  const laneCount = mode === "sequential" || mode === "concurrent" ? 1 : coreCount;
  const laneHeight = (LANE_AREA_H - LANE_GAP * (laneCount - 1)) / laneCount;

  const runningByLane = new Map<number, Task>();
  for (const t of tasks) {
    if ((t.status === "running" || t.status === "spawning") && t.coreId !== null) {
      runningByLane.set(t.coreId, t);
    }
  }

  const runningCount = tasks.filter((t) => t.status === "running").length;
  // Multiprocessing keeps an I/O-waiting task pinned in its own dedicated
  // lane (see the engine) — everywhere else, waiting-io means "off the
  // core entirely," so it belongs in this tray instead.
  const ioWaiting = tasks.filter((t) => t.status === "waiting-io" && mode !== "multiprocessing");
  const readyQueue = tasks.filter((t) => t.status === "queued" || t.status === "waiting-gil");

  const gilSlotWidth = coreCount > 0 ? LANE_W / coreCount : LANE_W;
  const holderLane = gil.holderId !== null ? (tasks.find((t) => t.id === gil.holderId)?.coreId ?? null) : null;
  const tokenX = holderLane !== null ? LANE_X + holderLane * gilSlotWidth + gilSlotWidth / 2 : LANE_X + LANE_W / 2;
  const tokenY = GIL_STRIP_H / 2 + 4;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" role="img" aria-label="Core and thread scheduling timeline">
      {mode === "multithreading" ? (
        <>
          {Array.from({ length: coreCount }, (_, i) => (
            <text key={i} x={LANE_X + i * gilSlotWidth + gilSlotWidth / 2} y={16} textAnchor="middle" fontSize={9} className="fill-text-faint font-mono">
              core {i}
            </text>
          ))}
          <line x1={LANE_X} y1={GIL_STRIP_H - 6} x2={VIEW_W - LANE_X} y2={GIL_STRIP_H - 6} stroke="var(--border)" strokeDasharray="2 3" />
          <g
            style={{
              transform: `translate(${tokenX}px, ${tokenY}px)`,
              transition: reducedMotion ? undefined : "transform 300ms ease-in-out",
            }}
          >
            <PadlockIcon color={gil.holderId !== null ? "var(--status-warn)" : "var(--text-faint)"} />
          </g>
        </>
      ) : (
        <text x={VIEW_W / 2} y={GIL_STRIP_H / 2 + 4} textAnchor="middle" fontSize={10} className="fill-text-faint">
          {mode === "multiprocessing" ? "No GIL — every process has its own interpreter" : "No GIL in this mode"}
        </text>
      )}

      <text x={VIEW_W - LANE_X} y={LANE_AREA_Y - 6} textAnchor="end" fontSize={9} className="fill-text-faint font-mono">
        {runningCount} core{runningCount === 1 ? "" : "s"} executing now
        {mode === "multithreading" ? ` · GIL ${gil.switches} handoff${gil.switches === 1 ? "" : "s"}` : ""}
      </text>

      {Array.from({ length: laneCount }, (_, i) => {
        const laneIndex = mode === "sequential" || mode === "concurrent" ? 0 : i;
        const y = LANE_AREA_Y + i * (laneHeight + LANE_GAP);
        const busyPct = Math.round(coreBusyPct[laneIndex] ?? 0);
        return (
          <g key={i}>
            <text x={LANE_X + 6} y={y - 4} fontSize={9} className="fill-text-faint font-mono">
              Core {laneIndex} · {busyPct}% busy
            </text>
            <TaskLane task={runningByLane.get(laneIndex)} x={LANE_X} y={y} width={LANE_W} height={laneHeight} />
          </g>
        );
      })}

      <text x={LANE_X} y={LANE_AREA_Y + LANE_AREA_H + 14} fontSize={9} className="fill-text-faint font-mono uppercase">
        on I/O wait (not using a core)
      </text>
      <ChipRow tasks={ioWaiting} y={LANE_AREA_Y + LANE_AREA_H + 28} />

      <text x={LANE_X} y={LANE_AREA_Y + LANE_AREA_H + IO_TRAY_H + 14} fontSize={9} className="fill-text-faint font-mono uppercase">
        waiting to run
      </text>
      <ChipRow tasks={readyQueue} y={LANE_AREA_Y + LANE_AREA_H + IO_TRAY_H + 28} />
    </svg>
  );
}
