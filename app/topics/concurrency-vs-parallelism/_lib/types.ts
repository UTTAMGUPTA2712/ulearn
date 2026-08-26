/**
 * Types for the concurrency/parallelism simulation. Colocated with this
 * topic's route on purpose — nothing here is shared with other topics.
 */

/** The four scheduling models the simulator can run. */
export type Mode = "sequential" | "concurrent" | "multithreading" | "multiprocessing";

/** CPU-bound tasks are one long compute burst; I/O-bound tasks alternate short compute with long waits. */
export type WorkloadType = "cpu" | "io";

/**
 * `queued` — spawned but never yet scheduled.
 * `spawning` — multiprocessing only: paying the one-time process-startup cost.
 * `running` — actually executing on a core right now.
 * `waiting-io` — off doing I/O (network/disk), not occupying any core.
 * `waiting-gil` — multithreading only: has a CPU leg ready to go but doesn't hold the GIL.
 * `done` — finished all its legs.
 */
export type TaskStatus = "queued" | "spawning" | "running" | "waiting-io" | "waiting-gil" | "done";

export interface TaskLeg {
  kind: "cpu" | "io";
  durationMs: number;
}

export interface Task {
  id: number;
  workload: WorkloadType;
  legs: TaskLeg[];
  legIndex: number;
  /** ms left in the current leg — decremented only while the task is actively progressing, so a preempted task resumes where it left off. */
  legRemainingMs: number;
  status: TaskStatus;
  /**
   * The lane this task is drawn in. Only meaningful while `running`/`spawning`
   * — sequential/concurrent/multithreading clear it the moment a task stops
   * running (there's nothing to visually "own" while blocked). Multiprocessing
   * is the one exception: a process keeps its core for its whole life, I/O
   * waits included, which is exactly what makes an I/O-bound process burning
   * a whole dedicated core at low utilization visible.
   */
  coreId: number | null;
  /** Multithreading: ms left before a forced GIL yield. Concurrent: reused as the plain round-robin time-slice remaining. */
  gilSliceRemainingMs: number;
  /** Multiprocessing only: ms left in the one-time process-spawn cost. */
  spawnRemainingMs: number;
  spawnedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  /** Stable per-task color identity `(id * 47) % 360` — used only for label text, never a shape fill (fills stay on the token palette). */
  hue: number;
}

export interface Core {
  id: number;
  busyMs: number;
}

export interface GilState {
  holderId: number | null;
  /** Cumulative handoffs this run — surfaced as a stat/log, not just an animation. */
  switches: number;
}

export interface LogEntry {
  id: number;
  time: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface RunStats {
  spawned: number;
  completed: number;
  runStartedAt: number | null;
  /** null while the run is still in progress. */
  runFinishedAt: number | null;
  gilWaitTotalMs: number;
  gilSwitches: number;
}

export interface SimSnapshot {
  now: number;
  mode: Mode;
  workload: WorkloadType;
  coreCount: number;
  gilQuantumMs: number;
  spawnOverheadMs: number;
  cores: Core[];
  tasks: Task[];
  gil: GilState;
  log: LogEntry[];
  stats: RunStats;
  /** Derived: `(runFinishedAt ?? now) - runStartedAt`, or 0 before a run has started. */
  wallClockMs: number;
  /** Derived per-core busy percentage over the `wallClockMs` window. */
  coreBusyPct: number[];
}
