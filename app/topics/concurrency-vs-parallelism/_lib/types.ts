/**
 * Types for the concurrency-vs-parallelism simulation. Colocated with this
 * topic's route on purpose — nothing here is shared with other topics.
 */

/** What the six tasks spend their time on. */
export type Workload = "cpu" | "io" | "mixed";

/**
 * `blocking` — a core takes a task and keeps it until it finishes, even while
 * the task sits waiting on I/O. `concurrent` — a core lets go of a task the
 * moment it starts waiting (and after each time slice), and picks up another.
 */
export type Scheduling = "blocking" | "concurrent";

export type SegmentKind = "cpu" | "io";

export interface Segment {
  kind: SegmentKind;
  ms: number;
}

/**
 * `ready` — wants a core, doesn't have one (or is being switched onto one).
 * `running` — on a core, computing. `io` — waiting on the network/disk.
 * `done` — finished.
 */
export type TaskState = "ready" | "running" | "io" | "done";

export interface Task {
  id: number;
  segments: readonly Segment[];
  /** Index into `segments` of the segment in progress. */
  seg: number;
  /** ms left in the current segment. */
  segLeft: number;
  state: TaskState;
  /** Core currently holding this task, or null. */
  core: number | null;
  finishedAt: number | null;
}

export interface Core {
  id: number;
  /** Task this core is running, switching to, or (blocking mode) blocked on. */
  task: number | null;
  /** The last task this core ran — switching back to the same one is free. */
  lastTask: number | null;
  /** ms left in a context switch, 0 when not switching. */
  switchLeft: number;
  /** CPU ms the current task has used since it got the core — concurrent mode preempts at the quantum. */
  sliceUsed: number;
}

export type CoreSpanKind = "cpu" | "blocked" | "switch";
export type TaskSpanKind = "cpu" | "io" | "ready";

/** One contiguous stretch on a core's row of the timeline. */
export interface CoreSpan {
  core: number;
  task: number;
  kind: CoreSpanKind;
  start: number;
  end: number;
}

/** One contiguous stretch on a task's row of the timeline. */
export interface TaskSpan {
  task: number;
  kind: TaskSpanKind;
  start: number;
  end: number;
}

export type Phase = "idle" | "running" | "paused" | "done";

export interface RunResult {
  id: number;
  workload: Workload;
  scheduling: Scheduling;
  cores: number;
  wallMs: number;
  /** Sequential wall time (1 core, blocking) for the same workload, divided by `wallMs`. */
  speedup: number;
  /** Share of total core time spent computing. */
  utilization: number;
  /** Share of total core time spent held by a task that was waiting on I/O. */
  blocked: number;
  switches: number;
}

export interface LogEntry {
  id: number;
  time: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface SimSnapshot {
  phase: Phase;
  workload: Workload;
  scheduling: Scheduling;
  cores: number;
  speed: number;
  /** Simulated ms since the run started. */
  now: number;
  tasks: Task[];
  coreStates: Core[];
  coreSpans: readonly CoreSpan[];
  taskSpans: readonly TaskSpan[];
  switches: number;
  /** Core-ms spent computing / blocked so far, for the live stats. */
  cpuMs: number;
  blockedMs: number;
  /** Wall time of the same workload run sequentially (1 core, blocking). */
  baselineMs: number;
  /** Width of the timeline's time axis, fixed per workload so every run is drawn on the same scale. */
  axisMs: number;
  /** Most recent first. */
  runs: RunResult[];
  log: LogEntry[];
}
