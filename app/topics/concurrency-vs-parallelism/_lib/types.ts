/**
 * Types for the concurrency/parallelism simulation. Colocated with this
 * topic's route on purpose — nothing here is shared with other topics.
 *
 * Deliberately simple: this topic's job is to make the Rob Pike distinction
 * ("dealing with a lot of things at once" vs "doing a lot of things at
 * once") visible in one glance, not to model a real scheduler. See
 * `engine.ts` for why there's no GIL, no I/O legs, no per-core busy% here —
 * an earlier version of this simulation modeled all of that and it made the
 * page harder to read, not easier.
 */

/** The three things being compared — matches the Simulate page's mode switch 1:1. */
export type Mode = "sequential" | "concurrent" | "parallel";

/**
 * `queued` — hasn't started yet.
 * `starting` — just claimed a lane, brief spin-up before it begins actually
 * making progress. Exists so a task never snaps straight from idle chip to
 * mid-progress bar — see `engine.ts`'s `STARTING_MS`.
 * `running` — actively making progress right now, in some lane.
 * `completing` — done making progress, holding a brief "finished" beat
 * before it's removed from the lane — see `COMPLETING_MS`.
 * `done` — finished.
 */
export type TaskStatus = "queued" | "starting" | "running" | "completing" | "done";

export interface Task {
  id: number;
  totalMs: number;
  /** ms of work left — decremented only while `running`, so a paused (queued) task resumes where it left off. */
  remainingMs: number;
  status: TaskStatus;
  /** ms left in the current `starting`/`completing` phase. Unused (0) in every other status. */
  phaseRemainingMs: number;
  /** Which lane currently holds this task. Null once it's back in the queue or finished. */
  laneId: number | null;
  startedAt: number | null;
  finishedAt: number | null;
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
}

export interface SimSnapshot {
  now: number;
  mode: Mode;
  /** Number of lanes currently drawn — 1 for sequential/concurrent, `workerCount` for parallel. */
  laneCount: number;
  /** How many lanes "parallel" mode uses — the one control this simulation exposes. */
  workerCount: number;
  tasks: Task[];
  log: LogEntry[];
  stats: RunStats;
  /** Derived: `(runFinishedAt ?? now) - runStartedAt`, or 0 before a run has started. */
  wallClockMs: number;
}
