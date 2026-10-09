import { useId } from "react";

import { MAX_CORES, TASK_COUNT, formatSeconds, taskLabel } from "../_lib/engine";
import type { Core, CoreSpan, Phase, Scheduling, Task, TaskSpan } from "../_lib/types";

const VIEW_W = 720;
const VIEW_H = 392;

const CHART_X0 = 78;
const CHART_X1 = 588;
const STATE_X = 600;

const AXIS_Y = 18;
const GRID_TOP = 26;

const CORE_EYEBROW_Y = 42;
const CORE_Y0 = 50;
const CORE_H = 24;
const CORE_GAP = 6;

const TASK_EYEBROW_Y = 188;
const TASK_Y0 = 196;
const TASK_H = 18;
const TASK_GAP = 6;

const GRID_BOTTOM = TASK_Y0 + TASK_COUNT * (TASK_H + TASK_GAP) - TASK_GAP;
const MARKER_LABEL_Y = GRID_BOTTOM + 16;
const LEGEND_Y = VIEW_H - 12;

const coreY = (i: number) => CORE_Y0 + i * (CORE_H + CORE_GAP);
const taskY = (i: number) => TASK_Y0 + i * (TASK_H + TASK_GAP);
/** Tasks reuse the categorical `--node-*` palette (a data encoding, §4); every block also prints the task's label. */
const taskColor = (id: number) => `var(--node-${id})`;

type LegendItem = { label: string; style: "fill" | "hollow" | "dotted" | "hatch" | "switch" };

/** Every mark on the timeline whose meaning isn't printed next to it (§10). */
const LEGEND: LegendItem[] = [
  { label: "computing (colored by task)", style: "fill" },
  { label: "waiting on I/O", style: "hollow" },
  { label: "ready, no core yet", style: "dotted" },
  { label: "core held but idle", style: "hatch" },
  { label: "context switch", style: "switch" },
];

const LEGEND_X = (() => {
  const xs: number[] = [];
  LEGEND.reduce((x, item) => (xs.push(x), x + 26 + item.label.length * 4.4), 14);
  return xs;
})();

type Dot = "active" | "warn" | "up" | "idle";
const DOT_COLOR: Record<Dot, string> = {
  active: "var(--status-active)",
  warn: "var(--status-warn)",
  up: "var(--status-up)",
  idle: "var(--text-faint)",
};

function StateText({ y, dot, text }: { y: number; dot: Dot | null; text: string }) {
  return (
    <g>
      {dot && <circle cx={STATE_X + 3} cy={y - 3} r={3} fill={DOT_COLOR[dot]} />}
      <text x={STATE_X + (dot ? 11 : 0)} y={y} fontSize={9} className="fill-text-muted">
        {text}
      </text>
    </g>
  );
}

function coreState(core: Core | undefined, tasks: Task[], phase: Phase): { dot: Dot | null; text: string } {
  if (!core) return { dot: null, text: "not in this run" };
  if (core.task === null) return { dot: "idle", text: phase === "done" ? "finished" : "idle" };
  const t = taskLabel(core.task);
  if (phase === "idle") return { dot: "idle", text: `${t} up first` };
  if (core.switchLeft > 0) return { dot: "idle", text: `switching to ${t}` };
  if (tasks[core.task].state === "io") return { dot: "warn", text: `blocked: ${t} on I/O` };
  return { dot: "active", text: `running ${t}` };
}

function taskState(task: Task, phase: Phase): { dot: Dot; text: string } {
  if (phase === "idle") return { dot: "idle", text: "queued" };
  switch (task.state) {
    case "done":
      return { dot: "up", text: `done at ${formatSeconds(task.finishedAt ?? 0)}` };
    case "io":
      return { dot: "warn", text: "waiting on I/O" };
    case "running":
      return { dot: "active", text: `on core ${(task.core ?? 0) + 1}` };
    default:
      return { dot: "idle", text: task.core === null ? "ready, no core" : "being switched in" };
  }
}

export function ConcurrencyDiagram({
  phase,
  scheduling,
  cores,
  now,
  tasks,
  coreStates,
  coreSpans,
  taskSpans,
  baselineMs,
  axisMs,
}: {
  phase: Phase;
  scheduling: Scheduling;
  cores: number;
  now: number;
  tasks: Task[];
  coreStates: Core[];
  coreSpans: readonly CoreSpan[];
  taskSpans: readonly TaskSpan[];
  baselineMs: number;
  axisMs: number;
}) {
  const hatchId = `hatch-${useId().replace(/:/g, "")}`;
  const x = (ms: number) => CHART_X0 + (Math.min(ms, axisMs) / axisMs) * (CHART_X1 - CHART_X0);
  const ticks = Array.from({ length: Math.floor(axisMs / 1000) + 1 }, (_, i) => i * 1000);

  const finished = phase === "done";
  const showCursor = phase === "running" || phase === "paused";
  // When the run lands right on the sequential line (it *was* sequential), one label is enough.
  const markersCollide = finished && Math.abs(x(now) - x(baselineMs)) < 90;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Timeline of ${TASK_COUNT} tasks on ${cores} core${cores === 1 ? "" : "s"}, ${scheduling} scheduling`}
    >
      <defs>
        <pattern id={hatchId} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={5} stroke="var(--status-warn)" strokeWidth={1.4} />
        </pattern>
      </defs>

      {/* Time axis */}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={GRID_TOP} x2={x(t)} y2={GRID_BOTTOM} stroke="var(--border)" strokeWidth={0.75} />
          <text x={x(t)} y={AXIS_Y} fontSize={8.5} textAnchor="middle" className="fill-text-faint font-mono">
            {t / 1000}s
          </text>
        </g>
      ))}

      {/* Cores */}
      <text x={14} y={CORE_EYEBROW_Y} fontSize={8.5} fontWeight={600} letterSpacing={0.6} className="fill-text-faint">
        CORES
      </text>
      {Array.from({ length: MAX_CORES }, (_, i) => {
        const y = coreY(i);
        const used = i < cores;
        const state = coreState(coreStates[i], tasks, phase);
        return (
          <g key={i} opacity={used ? 1 : 0.55}>
            <text x={14} y={y + CORE_H / 2 + 3} fontSize={10} className="fill-text">
              Core {i + 1}
            </text>
            <rect
              x={CHART_X0}
              y={y}
              width={CHART_X1 - CHART_X0}
              height={CORE_H}
              rx={4}
              fill={used ? "var(--panel-raised)" : "none"}
              stroke="var(--border)"
              strokeDasharray={used ? undefined : "3 3"}
            />
            <StateText y={y + CORE_H / 2 + 3} dot={state.dot} text={state.text} />
          </g>
        );
      })}
      {coreSpans.map((s) => {
        const y = coreY(s.core);
        const x0 = x(s.start);
        const w = Math.max(0.5, x(s.end) - x0);
        if (s.kind === "switch") {
          return (
            <rect
              key={`c${s.core}-${s.start}`}
              x={x0}
              y={y + 4}
              width={w}
              height={CORE_H - 8}
              fill="var(--text-faint)"
              opacity={0.55}
            />
          );
        }
        if (s.kind === "blocked") {
          return (
            <g key={`c${s.core}-${s.start}`}>
              <rect x={x0} y={y + 2} width={w} height={CORE_H - 4} fill={`url(#${hatchId})`} opacity={0.6} />
              {w >= 70 && (
                <text x={x0 + w / 2} y={y + CORE_H / 2 + 3} fontSize={8.5} textAnchor="middle" className="fill-text">
                  {taskLabel(s.task)} waiting
                </text>
              )}
            </g>
          );
        }
        return (
          <g key={`c${s.core}-${s.start}`}>
            <rect x={x0} y={y + 2} width={w} height={CORE_H - 4} rx={2} fill={taskColor(s.task)} />
            {w >= 18 && (
              <text
                x={x0 + w / 2}
                y={y + CORE_H / 2 + 3}
                fontSize={9}
                fontWeight={600}
                textAnchor="middle"
                fill="var(--bg)"
                className="font-mono"
              >
                {taskLabel(s.task)}
              </text>
            )}
          </g>
        );
      })}

      {/* Tasks */}
      <text x={14} y={TASK_EYEBROW_Y} fontSize={8.5} fontWeight={600} letterSpacing={0.6} className="fill-text-faint">
        TASKS
      </text>
      {tasks.map((task) => {
        const y = taskY(task.id);
        const state = taskState(task, phase);
        return (
          <g key={task.id}>
            <rect x={14} y={y + TASK_H / 2 - 4} width={8} height={8} rx={2} fill={taskColor(task.id)} />
            <text x={28} y={y + TASK_H / 2 + 3} fontSize={10} className="fill-text font-mono">
              {taskLabel(task.id)}
            </text>
            <StateText y={y + TASK_H / 2 + 3} dot={state.dot} text={state.text} />
            {task.finishedAt !== null && (
              <line
                x1={x(task.finishedAt)}
                y1={y}
                x2={x(task.finishedAt)}
                y2={y + TASK_H}
                stroke="var(--status-up)"
                strokeWidth={2}
              />
            )}
          </g>
        );
      })}
      {taskSpans.map((s) => {
        const y = taskY(s.task);
        const x0 = x(s.start);
        const w = Math.max(0.5, x(s.end) - x0);
        const key = `t${s.task}-${s.start}`;
        if (s.kind === "ready") {
          return (
            <line
              key={key}
              x1={x0}
              y1={y + TASK_H / 2}
              x2={x0 + w}
              y2={y + TASK_H / 2}
              stroke="var(--text-faint)"
              strokeWidth={1.5}
              strokeDasharray="1.5 2.5"
            />
          );
        }
        if (s.kind === "io") {
          return (
            <rect
              key={key}
              x={x0 + 0.5}
              y={y + 3.5}
              width={Math.max(0, w - 1)}
              height={TASK_H - 7}
              rx={2}
              fill="none"
              stroke={taskColor(s.task)}
              strokeWidth={1.2}
            />
          );
        }
        return <rect key={key} x={x0} y={y + 2} width={w} height={TASK_H - 4} rx={2} fill={taskColor(s.task)} />;
      })}

      {/* Sequential baseline and finish line */}
      {!markersCollide && (
        <g>
          <line
            x1={x(baselineMs)}
            y1={GRID_TOP}
            x2={x(baselineMs)}
            y2={GRID_BOTTOM + 4}
            stroke="var(--text-muted)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text x={x(baselineMs)} y={MARKER_LABEL_Y} fontSize={8.5} textAnchor="middle" className="fill-text-muted">
            sequential: {formatSeconds(baselineMs)}
          </text>
        </g>
      )}
      {showCursor && (
        <line x1={x(now)} y1={GRID_TOP} x2={x(now)} y2={GRID_BOTTOM} stroke="var(--text)" strokeWidth={1} opacity={0.5} />
      )}
      {finished && (
        <g>
          <line x1={x(now)} y1={GRID_TOP} x2={x(now)} y2={GRID_BOTTOM + 4} stroke="var(--accent)" strokeWidth={1.5} />
          <text
            x={x(now)}
            y={MARKER_LABEL_Y}
            fontSize={8.5}
            fontWeight={600}
            textAnchor="middle"
            fill="var(--accent)"
          >
            finished: {formatSeconds(now)}
            {markersCollide && Math.abs(now - baselineMs) < 1 ? " (sequential)" : ""}
          </text>
        </g>
      )}

      {/* Legend */}
      {LEGEND.map((item, i) => (
        <g key={item.label} transform={`translate(${LEGEND_X[i]}, ${LEGEND_Y})`}>
          {item.style === "fill" && <rect x={0} y={-4} width={12} height={8} rx={1.5} fill={taskColor(0)} />}
          {item.style === "hollow" && (
            <rect x={0.5} y={-3.5} width={11} height={7} rx={1.5} fill="none" stroke={taskColor(0)} strokeWidth={1.2} />
          )}
          {item.style === "dotted" && (
            <line x1={0} y1={0} x2={12} y2={0} stroke="var(--text-faint)" strokeWidth={1.5} strokeDasharray="1.5 2.5" />
          )}
          {item.style === "hatch" && (
            <rect x={0} y={-4} width={12} height={8} fill={`url(#${hatchId})`} opacity={0.8} />
          )}
          {item.style === "switch" && (
            <rect x={0} y={-4} width={12} height={8} fill="var(--text-faint)" opacity={0.55} />
          )}
          <text x={16} y={3} fontSize={8.5} className="fill-text-faint">
            {item.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
