import type { LogEntry, Mode, RunStats, SimSnapshot, Task } from "./types";

/**
 * Fixed, deliberately uneven durations — a couple of quick tasks, a couple
 * of long ones, mixed rather than sorted — shared across all three screens
 * so the "different tasks take different amounts of time" point is always
 * visible, and so Sequential/Concurrent/Parallel are showing literally the
 * same batch of work, making them a fair comparison rather than three
 * independent random draws that might happen to look similar.
 */
const TASK_DURATIONS_MS = [1600, 700, 2200, 1000, 1900, 1300];
const TASK_COUNT = TASK_DURATIONS_MS.length;
const DEFAULT_WORKER_COUNT = 3;

/** How long a task holds the single lane in "concurrent" mode before yielding to the next one — long enough to watch, short enough to read as interleaving rather than sequential handoffs. */
const CONCURRENT_SLICE_MS = 300;

/**
 * Brief holds either side of a task's actual progress, so a lane never
 * snaps directly from "idle" to "mid-progress" or from "mid-progress" to
 * "gone" — every task visibly starts and visibly finishes instead of just
 * appearing and disappearing.
 */
const STARTING_MS = 220;
const COMPLETING_MS = 260;

/** Pause after a full batch finishes before the run quietly restarts itself — this is a looping animation, not something a viewer has to click "restart" on. */
const LOOP_PAUSE_MS = 900;

let logIdCounter = 0;

/**
 * Owns one looping demo run for a single, fixed `Mode` — this topic's
 * Simulate page is a set of switchable screens (see `simulation.tsx`), each
 * backed by its own engine instance, rather than one engine whose mode gets
 * reconfigured through control-panel buttons. There is nothing to
 * configure here: `mode` and `workerCount` are set once at construction and
 * the run just plays on a loop. Mutated in place on every `tick()` —
 * `getSnapshot()` is the only thing that leaves the engine (see the
 * load-balancer topic's `use-simulation.ts` for why this stays a plain
 * mutable class outside React).
 *
 * Three scheduling models live here, one per `Mode`:
 * - `sequential` — one lane, strict FIFO. Task 2 doesn't start until task 1
 *   fully finishes.
 * - `concurrent` — still one lane, but tasks take turns in short slices
 *   instead of running to completion — interleaved, never simultaneous.
 *   Total time is roughly the same as sequential; what changes is that no
 *   single task blocks all the others from making *some* progress.
 * - `parallel` — `workerCount` lanes, each genuinely running a task at the
 *   same instant. More lanes finish the same batch faster.
 *
 * That's the entire Rob Pike distinction this page exists to make visible —
 * concurrency is a change in structure, parallelism is a change in how much
 * finishes per second.
 */
export class ConcurrencyEngine {
  readonly mode: Mode;
  readonly workerCount: number;

  now = 0;
  tasks: Task[] = [];
  log: LogEntry[] = [];
  stats: RunStats = this.freshStats();

  /** ms left before the current single-lane holder yields, in "concurrent" mode only. */
  private sliceRemainingMs = 0;
  /** ms left before a finished run quietly spawns the next one. */
  private loopPauseRemainingMs = 0;

  constructor(mode: Mode, workerCount: number = DEFAULT_WORKER_COUNT) {
    this.mode = mode;
    this.workerCount = mode === "parallel" ? workerCount : 1;
    this.spawnBurst();
  }

  private freshStats(): RunStats {
    return { spawned: 0, completed: 0, runStartedAt: null, runFinishedAt: null };
  }

  private addLog(level: LogEntry["level"], message: string) {
    this.log.push({ id: logIdCounter++, time: this.now, level, message });
    if (this.log.length > 8) this.log.shift();
  }

  private buildTask(id: number, totalMs: number): Task {
    return {
      id,
      totalMs,
      remainingMs: totalMs,
      status: "queued",
      phaseRemainingMs: 0,
      laneId: null,
      startedAt: null,
      finishedAt: null,
    };
  }

  private spawnBurst() {
    this.now = 0;
    this.tasks = TASK_DURATIONS_MS.map((ms, i) => this.buildTask(i, ms));
    this.stats = this.freshStats();
    this.stats.spawned = TASK_COUNT;
    this.stats.runStartedAt = 0;
    this.sliceRemainingMs = 0;
  }

  private laneCount(): number {
    return this.mode === "parallel" ? this.workerCount : 1;
  }

  /** Claims a lane for a queued task — it enters `starting`, not `running`, so the lane visibly spins up before progress begins. */
  private beginTask(task: Task, laneId: number) {
    task.status = "starting";
    task.phaseRemainingMs = STARTING_MS;
    task.laneId = laneId;
    if (task.startedAt === null) task.startedAt = this.now;
  }

  private finishTask(task: Task) {
    task.status = "done";
    task.laneId = null;
    task.finishedAt = this.now;
    this.stats.completed++;
  }

  /**
   * Advances a task already holding a lane through `starting` -> `running`
   * -> `completing` -> (caller calls `finishTask`). Shared by sequential and
   * parallel, since neither ever interrupts a task mid-`running` the way
   * concurrent's round-robin does — see `tickConcurrent` for that case.
   * Returns `true` once the task is ready to be handed to `finishTask`.
   */
  private advanceLane(task: Task, deltaMs: number): boolean {
    if (task.status === "starting") {
      task.phaseRemainingMs -= deltaMs;
      if (task.phaseRemainingMs <= 0) task.status = "running";
      return false;
    }
    if (task.status === "running") {
      task.remainingMs -= deltaMs;
      if (task.remainingMs <= 0) {
        task.status = "completing";
        task.phaseRemainingMs = COMPLETING_MS;
      }
      return false;
    }
    // completing
    task.phaseRemainingMs -= deltaMs;
    return task.phaseRemainingMs <= 0;
  }

  /** One lane, strict FIFO — a task runs to completion before the next one starts. */
  private tickSequential(deltaMs: number) {
    const active = this.tasks.find((t) => t.laneId === 0 && t.status !== "done");
    if (!active) {
      const next = this.tasks.find((t) => t.status === "queued");
      if (next) this.beginTask(next, 0);
      return;
    }
    if (this.advanceLane(active, deltaMs)) this.finishTask(active);
  }

  /** One lane, round-robin — tasks take short turns instead of running to completion, each turn beginning with the same visible spin-up as a fresh start. */
  private tickConcurrent(deltaMs: number) {
    let active = this.tasks.find((t) => t.laneId === 0 && t.status !== "done");
    if (!active) {
      const next = this.tasks.find((t) => t.status === "queued");
      if (!next) return;
      this.beginTask(next, 0);
      this.sliceRemainingMs = CONCURRENT_SLICE_MS;
      active = next;
    }

    if (active.status === "starting") {
      active.phaseRemainingMs -= deltaMs;
      if (active.phaseRemainingMs <= 0) active.status = "running";
      return;
    }

    if (active.status === "running") {
      active.remainingMs -= deltaMs;
      this.sliceRemainingMs -= deltaMs;
      if (active.remainingMs <= 0) {
        active.status = "completing";
        active.phaseRemainingMs = COMPLETING_MS;
      } else if (this.sliceRemainingMs <= 0 && this.tasks.some((t) => t.status === "queued")) {
        active.status = "queued";
        active.laneId = null;
        this.addLog("info", `T${active.id}'s turn ended — switching to the next task`);
      }
      return;
    }

    // completing
    active.phaseRemainingMs -= deltaMs;
    if (active.phaseRemainingMs <= 0) this.finishTask(active);
  }

  /** `workerCount` lanes, each genuinely running a task at the same instant. */
  private tickParallel(deltaMs: number) {
    for (let lane = 0; lane < this.workerCount; lane++) {
      const occupant = this.tasks.find((t) => t.laneId === lane && t.status !== "done");
      if (occupant) {
        if (this.advanceLane(occupant, deltaMs)) this.finishTask(occupant);
        continue;
      }
      const next = this.tasks.find((t) => t.status === "queued");
      if (next) this.beginTask(next, lane);
    }
  }

  tick(deltaMs: number) {
    if (this.stats.runFinishedAt !== null) {
      this.loopPauseRemainingMs -= deltaMs;
      if (this.loopPauseRemainingMs <= 0) this.spawnBurst();
      return;
    }

    this.now += deltaMs;

    switch (this.mode) {
      case "sequential":
        this.tickSequential(deltaMs);
        break;
      case "concurrent":
        this.tickConcurrent(deltaMs);
        break;
      case "parallel":
        this.tickParallel(deltaMs);
        break;
    }

    if (this.stats.spawned > 0 && this.tasks.every((t) => t.status === "done")) {
      this.stats.runFinishedAt = this.now;
      this.loopPauseRemainingMs = LOOP_PAUSE_MS;
      this.addLog("info", `Batch finished in ${Math.round(this.now)}ms — starting over`);
    }
  }

  getSnapshot(): SimSnapshot {
    const runStartedAt = this.stats.runStartedAt;
    const wallClockMs = runStartedAt === null ? 0 : (this.stats.runFinishedAt ?? this.now) - runStartedAt;

    return {
      now: this.now,
      mode: this.mode,
      laneCount: this.laneCount(),
      workerCount: this.workerCount,
      tasks: this.tasks.map((t) => ({ ...t })),
      log: [...this.log],
      stats: { ...this.stats },
      wallClockMs,
    };
  }
}
