import type { Task, TaskStatus } from "../_lib/types";

const VIEW_W = 720;
const LANE_X = 20;
const LANE_W = VIEW_W - LANE_X * 2;
const LANE_AREA_Y = 16;
const LANE_GAP = 8;
const QUEUE_ROW_H = 62;
const CHIP_W = 44;

function progressFraction(task: Task): number {
  if (task.status === "completing" || task.status === "done") return 1;
  if (task.status === "starting") return 0;
  return Math.min(1, Math.max(0, 1 - task.remainingMs / task.totalMs));
}

function TaskChip({ task, x, y }: { task: Task; x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-18} y={-10} width={36} height={20} rx={5} fill="var(--panel-raised)" stroke="var(--border-strong)" />
      <text textAnchor="middle" y={4} fontSize={9} className="fill-text-muted font-mono">
        T{task.id}
      </text>
    </g>
  );
}

/** A row of task chips that overflows gracefully instead of running off the diagram. */
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

/** A small checkmark glyph — the "completing" phase's visual payoff, not just a color change. */
function CheckIcon({ x, y, opacity }: { x: number; y: number; opacity: number }) {
  return (
    <path
      d={`M ${x - 5} ${y} l 3.5 3.5 L ${x + 6} ${y - 6}`}
      fill="none"
      stroke="var(--status-up)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      style={{ transition: "opacity 150ms ease-out" }}
    />
  );
}

const BORDER_COLOR: Record<TaskStatus | "idle", string> = {
  idle: "var(--border)",
  queued: "var(--border)",
  starting: "var(--text-faint)",
  running: "var(--accent)",
  completing: "var(--status-up)",
  done: "var(--border)",
};

const LABEL: Record<TaskStatus | "idle", (id: number) => string> = {
  idle: () => "idle",
  queued: () => "idle",
  starting: (id) => `T${id} · starting…`,
  running: (id) => `T${id}`,
  completing: (id) => `T${id} · finishing…`,
  done: () => "idle",
};

/**
 * One lane's box. Deliberately a single, always-mounted set of elements
 * (border rect, fill sweep, label, percentage, checkmark) whose *attributes*
 * change with status rather than swapping in a differently-shaped element
 * tree per status — that's what lets the border color, fill and checkmark
 * genuinely transition instead of hard-cutting between states.
 *
 * The fill is a full-height tinted sweep across the whole card, not a thin
 * line at the bottom edge — a 4-5px sliver against a tall, mostly-empty box
 * reads as "nothing is happening," which is the opposite of the point.
 */
function Lane({
  task,
  x,
  y,
  width,
  height,
  reducedMotion,
}: {
  task: Task | undefined;
  x: number;
  y: number;
  width: number;
  height: number;
  reducedMotion: boolean;
}) {
  const status = task?.status ?? "idle";
  const fraction = task ? progressFraction(task) : 0;
  const fillColor = status === "completing" ? "var(--status-up)" : "var(--status-active)";
  const label = task ? LABEL[status](task.id) : "idle";
  const colorTransition = reducedMotion ? undefined : "stroke 200ms ease-out";
  const fillTransition = reducedMotion ? undefined : "width 150ms linear, opacity 150ms ease-out, fill 200ms ease-out";
  const showPct = status === "running";

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={8} fill="var(--panel-raised)" />
      <rect
        x={x}
        y={y}
        width={Math.max(0, width * fraction)}
        height={height}
        rx={8}
        fill={fillColor}
        opacity={fraction > 0 ? 0.22 : 0}
        style={{ transition: fillTransition }}
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill="none"
        stroke={BORDER_COLOR[status]}
        strokeWidth={1.5}
        strokeDasharray={status === "starting" ? "5 4" : undefined}
        style={{ transition: colorTransition }}
      />
      <text
        x={x + 14}
        y={y + height / 2 + 5}
        fontSize={13}
        fontWeight={task ? 600 : 400}
        className={task ? "fill-text font-mono" : "fill-text-faint"}
      >
        {label}
      </text>
      <text
        x={x + width - 16}
        y={y + height / 2 + 5}
        textAnchor="end"
        fontSize={13}
        fontWeight={600}
        className="fill-text-muted font-mono"
        opacity={showPct ? 1 : 0}
        style={{ transition: "opacity 150ms ease-out" }}
      >
        {Math.round(fraction * 100)}%
      </text>
      <CheckIcon x={x + width - 20} y={y + height / 2} opacity={status === "completing" ? 1 : 0} />
    </g>
  );
}

export function ConcurrencyDiagram({
  laneCount,
  tasks,
  reducedMotion,
}: {
  laneCount: number;
  tasks: Task[];
  reducedMotion: boolean;
}) {
  const laneAreaH = 220;
  const laneHeight = (laneAreaH - LANE_GAP * (laneCount - 1)) / laneCount;
  const viewH = LANE_AREA_Y + laneAreaH + QUEUE_ROW_H;

  const occupantByLane = new Map<number, Task>();
  for (const t of tasks) {
    if (t.laneId !== null && t.status !== "queued" && t.status !== "done") occupantByLane.set(t.laneId, t);
  }
  const queued = tasks.filter((t) => t.status === "queued");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${viewH}`} className="h-full w-full" role="img" aria-label="Tasks running across lanes">
      {Array.from({ length: laneCount }, (_, i) => {
        const y = LANE_AREA_Y + i * (laneHeight + LANE_GAP);
        return (
          <g key={i}>
            {laneCount > 1 && (
              <text x={LANE_X + 6} y={y - 4} fontSize={9} className="fill-text-faint font-mono">
                worker {i}
              </text>
            )}
            <Lane task={occupantByLane.get(i)} x={LANE_X} y={y} width={LANE_W} height={laneHeight} reducedMotion={reducedMotion} />
          </g>
        );
      })}

      <text x={LANE_X} y={LANE_AREA_Y + laneAreaH + 16} fontSize={9} className="fill-text-faint font-mono uppercase">
        waiting its turn
      </text>
      <ChipRow tasks={queued} y={LANE_AREA_Y + laneAreaH + 32} />

      <text x={VIEW_W - LANE_X} y={LANE_AREA_Y + laneAreaH + 16} textAnchor="end" fontSize={9} className="fill-text-faint font-mono">
        {done.length} done
      </text>
    </svg>
  );
}
