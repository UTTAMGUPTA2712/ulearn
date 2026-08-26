import { Button } from "@/components/simulation/button";
import { StatusDot } from "@/components/ui/status-dot";

import type { Mode, Task, TaskStatus, WorkloadType } from "../_lib/types";

const MODES: { value: Mode; label: string }[] = [
  { value: "sequential", label: "Sequential" },
  { value: "concurrent", label: "Concurrent (1 core)" },
  { value: "multithreading", label: "Multithreading" },
  { value: "multiprocessing", label: "Multiprocessing" },
];

export function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Mode</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <Button key={m.value} active={mode === m.value} onClick={() => onChange(m.value)}>
            {m.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function WorkloadToggle({ workload, onChange }: { workload: WorkloadType; onChange: (w: WorkloadType) => void }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Workload</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button active={workload === "cpu"} onClick={() => onChange("cpu")}>
          CPU-bound
        </Button>
        <Button active={workload === "io"} onClick={() => onChange("io")}>
          I/O-bound
        </Button>
      </div>
    </div>
  );
}

export function CoreCountControl({ mode, coreCount, onChange }: { mode: Mode; coreCount: number; onChange: (n: number) => void }) {
  const disabled = mode === "sequential" || mode === "concurrent";
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Cores</p>
      <div className="mt-2 space-y-2 rounded-xl border border-border bg-panel p-3">
        <label className={`flex items-center gap-2 text-[11px] ${disabled ? "text-text-faint" : "text-text-muted"}`}>
          core count
          <input
            type="range"
            min={1}
            max={6}
            value={coreCount}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="min-w-0 flex-1 accent-accent disabled:opacity-50"
          />
          <span className="w-4 shrink-0 text-right font-mono">{coreCount}</span>
        </label>
        {disabled && <p className="text-[11px] text-text-faint">Single core in this mode — that&apos;s the point.</p>}
      </div>
    </div>
  );
}

export function AdvancedConfig({
  gilQuantumMs,
  spawnOverheadMs,
  onSetGilQuantumMs,
  onSetSpawnOverheadMs,
}: {
  gilQuantumMs: number;
  spawnOverheadMs: number;
  onSetGilQuantumMs: (ms: number) => void;
  onSetSpawnOverheadMs: (ms: number) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Advanced</p>
      <div className="mt-2 space-y-2.5 rounded-xl border border-border bg-panel p-3">
        <label className="flex items-center gap-2 text-[11px] text-text-muted">
          GIL quantum
          <input
            type="range"
            min={100}
            max={500}
            step={20}
            value={gilQuantumMs}
            onChange={(e) => onSetGilQuantumMs(Number(e.target.value))}
            className="min-w-0 flex-1 accent-accent"
          />
          <span className="w-12 shrink-0 text-right font-mono">{gilQuantumMs}ms</span>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-text-muted">
          spawn overhead
          <input
            type="range"
            min={100}
            max={800}
            step={20}
            value={spawnOverheadMs}
            onChange={(e) => onSetSpawnOverheadMs(Number(e.target.value))}
            className="min-w-0 flex-1 accent-accent"
          />
          <span className="w-12 shrink-0 text-right font-mono">{spawnOverheadMs}ms</span>
        </label>
      </div>
    </div>
  );
}

export function TaskBurstControls({
  burstSize,
  onSetBurstSize,
  onRunBurst,
  onAddTask,
  onReset,
}: {
  burstSize: number;
  onSetBurstSize: (n: number) => void;
  onRunBurst: () => void;
  onAddTask: () => void;
  onReset: () => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Tasks</p>
      <div className="mt-2 space-y-2.5 rounded-xl border border-border bg-panel p-3">
        <label className="flex items-center gap-2 text-[11px] text-text-muted">
          burst size
          <input
            type="range"
            min={2}
            max={12}
            value={burstSize}
            onChange={(e) => onSetBurstSize(Number(e.target.value))}
            className="min-w-0 flex-1 accent-accent"
          />
          <span className="w-6 shrink-0 text-right font-mono">{burstSize}</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          <Button primary onClick={onRunBurst}>
            Run task burst
          </Button>
          <Button onClick={onAddTask}>Add task</Button>
          <Button danger onClick={onReset}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

const STATUS_DOT: Record<TaskStatus, "up" | "warn" | "down" | "active" | "idle"> = {
  running: "active",
  "waiting-io": "warn",
  "waiting-gil": "warn",
  spawning: "idle",
  done: "up",
  queued: "idle",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  running: "running",
  "waiting-io": "I/O wait",
  "waiting-gil": "GIL wait",
  spawning: "spawning",
  done: "done",
  queued: "queued",
};

function taskProgress(task: Task): number {
  const leg = task.legs[task.legIndex];
  if (!leg) return 1;
  return Math.min(1, Math.max(0, 1 - task.legRemainingMs / leg.durationMs));
}

export function TaskGrid({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div>
        <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Tasks</p>
        <p className="mt-2 text-[11px] text-text-faint">No tasks yet — run a burst to start.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Tasks</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-xl border border-border bg-panel p-2.5">
            <div className="flex items-center gap-1.5">
              <StatusDot status={STATUS_DOT[task.status]} />
              <span className="font-mono text-xs text-text">T{task.id}</span>
              <span className="ml-auto text-[10px] text-text-faint">{STATUS_LABEL[task.status]}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-border">
              <div
                className="h-1.5 rounded-full bg-status-active transition-[width]"
                style={{ width: `${taskProgress(task) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
