import type { Core, GilState, LogEntry, Mode, RunStats, SimSnapshot, Task, TaskLeg, WorkloadType } from "./types";

const DEFAULT_CORE_COUNT = 4;
const MIN_CORES = 1;
const MAX_CORES = 6;

/** Plain round-robin time slice for the single-core "concurrent" mode — no GIL involved, just interleaving. */
const CONCURRENT_QUANTUM_MS = 150;

const DEFAULT_GIL_QUANTUM_MS = 200;
const MIN_GIL_QUANTUM_MS = 100;
const MAX_GIL_QUANTUM_MS = 500;

const DEFAULT_SPAWN_OVERHEAD_MS = 400;
const MIN_SPAWN_OVERHEAD_MS = 100;
const MAX_SPAWN_OVERHEAD_MS = 800;

const CPU_BURST_MIN_MS = 900;
const CPU_BURST_MAX_MS = 1600;
const IO_LEG_COUNT = 3;
const IO_CPU_LEG_MIN_MS = 60;
const IO_CPU_LEG_MAX_MS = 140;
const IO_WAIT_MIN_MS = 350;
const IO_WAIT_MAX_MS = 650;

const DEFAULT_BURST_SIZE = 6;
const MIN_BURST_SIZE = 2;
const MAX_BURST_SIZE = 12;
const MAX_TASKS = 24;
const MAX_LOG_LINES = 60;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * CPU-bound tasks are a single long compute burst. I/O-bound tasks alternate
 * a short "handle the request" burst with a much longer "wait on the
 * network/disk" leg, a few times — a small request/response cycle repeated,
 * not one giant wait.
 */
function buildLegs(workload: WorkloadType): TaskLeg[] {
  if (workload === "cpu") {
    return [{ kind: "cpu", durationMs: randomBetween(CPU_BURST_MIN_MS, CPU_BURST_MAX_MS) }];
  }
  const legs: TaskLeg[] = [];
  for (let i = 0; i < IO_LEG_COUNT; i++) {
    legs.push({ kind: "cpu", durationMs: randomBetween(IO_CPU_LEG_MIN_MS, IO_CPU_LEG_MAX_MS) });
    legs.push({ kind: "io", durationMs: randomBetween(IO_WAIT_MIN_MS, IO_WAIT_MAX_MS) });
  }
  return legs;
}

let taskIdCounter = 0;
let logIdCounter = 0;

/**
 * Owns the entire simulated world: every task's scheduling state, the GIL,
 * per-core occupancy and a short event log. Mutated in place on every
 * `tick()` — `getSnapshot()` is the only thing that leaves the engine. See
 * the load-balancer topic's `use-simulation.ts` for why this stays a plain
 * mutable class outside React.
 *
 * Four independent scheduling algorithms live here, one per `Mode` — see
 * `tickSequential`/`tickConcurrentSingleCore`/`tickMultithreading`/
 * `tickMultiprocessing`. Switching mode, workload, or core count always
 * resets the run: the whole point of this UI is an A/B wall-clock
 * comparison, and letting state leak across an incompatible mode (a
 * `waiting-gil` task surviving into multiprocessing, say) would be both
 * undefined and actively misleading.
 */
export class ConcurrencyEngine {
  now = 0;
  mode: Mode = "sequential";
  workload: WorkloadType = "cpu";
  coreCount = DEFAULT_CORE_COUNT;
  gilQuantumMs = DEFAULT_GIL_QUANTUM_MS;
  spawnOverheadMs = DEFAULT_SPAWN_OVERHEAD_MS;
  cores: Core[] = [];
  tasks: Task[] = [];
  gil: GilState = { holderId: null, switches: 0 };
  log: LogEntry[] = [];
  stats: RunStats = this.freshStats();

  /** Round-robin lane counter for multithreading's purely-cosmetic core assignment — see `tickMultithreading`. */
  private nextLane = 0;

  constructor() {
    this.rebuildCores();
  }

  private freshStats(): RunStats {
    return {
      spawned: 0,
      completed: 0,
      runStartedAt: null,
      runFinishedAt: null,
      gilWaitTotalMs: 0,
      gilSwitches: 0,
    };
  }

  private rebuildCores() {
    this.cores = Array.from({ length: this.coreCount }, (_, id) => ({ id, busyMs: 0 }));
  }

  private addLog(level: LogEntry["level"], message: string) {
    this.log.push({ id: logIdCounter++, time: this.now, level, message });
    if (this.log.length > MAX_LOG_LINES) this.log.shift();
  }

  private resetRun() {
    this.tasks = [];
    this.rebuildCores();
    this.gil = { holderId: null, switches: 0 };
    this.stats = this.freshStats();
    this.nextLane = 0;
  }

  setMode(mode: Mode) {
    this.mode = mode;
    this.resetRun();
    this.addLog("info", `Mode switched to ${mode} — run reset`);
  }

  setWorkload(workload: WorkloadType) {
    this.workload = workload;
    this.resetRun();
    this.addLog("info", `Workload switched to ${workload}-bound — run reset`);
  }

  setCoreCount(n: number) {
    this.coreCount = Math.max(MIN_CORES, Math.min(MAX_CORES, Math.round(n)));
    this.resetRun();
  }

  setGilQuantumMs(ms: number) {
    this.gilQuantumMs = Math.max(MIN_GIL_QUANTUM_MS, Math.min(MAX_GIL_QUANTUM_MS, ms));
  }

  setSpawnOverheadMs(ms: number) {
    this.spawnOverheadMs = Math.max(MIN_SPAWN_OVERHEAD_MS, Math.min(MAX_SPAWN_OVERHEAD_MS, ms));
  }

  private buildTask(): Task {
    const id = taskIdCounter++;
    const legs = buildLegs(this.workload);
    return {
      id,
      workload: this.workload,
      legs,
      legIndex: 0,
      legRemainingMs: legs[0].durationMs,
      status: "queued",
      coreId: null,
      gilSliceRemainingMs: 0,
      spawnRemainingMs: 0,
      spawnedAt: this.now,
      startedAt: null,
      finishedAt: null,
      hue: (id * 47) % 360,
    };
  }

  /** The primary A/B action: clears any previous run and spawns a fresh batch under the current mode/workload. */
  spawnBurst(size: number = DEFAULT_BURST_SIZE) {
    const clamped = Math.max(MIN_BURST_SIZE, Math.min(MAX_BURST_SIZE, Math.round(size)));
    this.resetRun();
    this.stats.runStartedAt = this.now;
    for (let i = 0; i < clamped; i++) this.tasks.push(this.buildTask());
    this.stats.spawned = clamped;
    this.addLog("info", `Spawned ${clamped} ${this.workload}-bound tasks under ${this.mode}`);
  }

  /** Appends one task without resetting — for exploring backlog behavior once tasks outnumber cores. */
  addTask() {
    if (this.tasks.length >= MAX_TASKS) return;
    if (this.stats.runStartedAt === null) this.stats.runStartedAt = this.now;
    this.tasks.push(this.buildTask());
    this.stats.spawned++;
  }

  reset() {
    this.resetRun();
    this.addLog("info", "Reset");
  }

  /**
   * Shared leg-completion handoff. Routes a task that just finished a leg to
   * whatever it needs next: done, off to I/O, or back into contention for a
   * CPU leg — the exact "how do I get scheduled again" status depends on the
   * mode, since each mode's scheduler looks for a different status.
   */
  private advanceLeg(task: Task) {
    task.legIndex++;
    if (task.legIndex >= task.legs.length) {
      task.status = "done";
      task.finishedAt = this.now;
      this.stats.completed++;
      this.addLog("info", `T${task.id} done in ${Math.round(this.now - task.spawnedAt)}ms`);
      return;
    }

    const nextLeg = task.legs[task.legIndex];
    task.legRemainingMs = nextLeg.durationMs;

    if (nextLeg.kind === "io") {
      task.status = "waiting-io";
      return;
    }

    // Needs to run a CPU leg again.
    if (this.mode === "multithreading") {
      task.status = "waiting-gil"; // must reacquire the GIL
    } else if (this.mode === "multiprocessing") {
      task.status = "running"; // still owns its dedicated core — no scheduling decision needed
    } else {
      task.status = "queued"; // sequential/concurrent: re-enter the FIFO/round-robin
    }
  }

  /** Exactly one task active (running or waiting-io) at a time, strict FIFO — the core sits idle through I/O waits too. */
  private tickSequential(deltaMs: number) {
    const active = this.tasks.find((t) => t.status === "running" || t.status === "waiting-io");
    if (!active) {
      const next = this.tasks.find((t) => t.status === "queued");
      if (next) {
        next.status = "running";
        next.coreId = 0;
        next.startedAt = this.now;
      }
      return;
    }

    active.legRemainingMs -= deltaMs;
    if (active.legRemainingMs > 0) return;
    if (active.status === "running") active.coreId = null; // cleared before advanceLeg may hand it to waiting-io/done
    this.advanceLeg(active);
  }

  /** One shared lane, round-robin time-sliced. I/O immediately frees the lane — only CPU legs get sliced. */
  private tickConcurrentSingleCore(deltaMs: number) {
    const running = this.tasks.find((t) => t.coreId === 0 && t.status === "running");

    if (!running) {
      const next = this.tasks.find((t) => t.status === "queued");
      if (next) {
        next.status = "running";
        next.coreId = 0;
        if (next.startedAt === null) next.startedAt = this.now;
        next.gilSliceRemainingMs = CONCURRENT_QUANTUM_MS;
      }
    } else {
      running.legRemainingMs -= deltaMs;
      running.gilSliceRemainingMs -= deltaMs;
      if (running.legRemainingMs <= 0) {
        running.coreId = null;
        this.advanceLeg(running);
      } else if (running.gilSliceRemainingMs <= 0 && this.tasks.some((t) => t.status === "queued")) {
        running.status = "queued";
        running.coreId = null;
        this.addLog("info", `T${running.id}'s time slice expired — round-robin yield`);
      }
    }

    for (const t of this.tasks) {
      if (t.status === "waiting-io") {
        t.legRemainingMs -= deltaMs;
        if (t.legRemainingMs <= 0) this.advanceLeg(t);
      }
    }
  }

  /**
   * `coreCount` lanes exist for visual spread, but at most one task is ever
   * `"running"` engine-wide — enforced by a real GIL. A task's lane is
   * reassigned fresh (round-robin) every time it acquires the GIL and
   * cleared the moment it stops running: since only one task can ever be
   * running at once, this can never collide two live tasks onto one lane —
   * unlike multiprocessing, where a lane is a task's own dedicated core.
   */
  private tickMultithreading(deltaMs: number) {
    const holder = this.gil.holderId !== null ? (this.tasks.find((t) => t.id === this.gil.holderId) ?? null) : null;

    if (!holder) {
      const candidate = this.tasks.find(
        (t) => (t.status === "queued" || t.status === "waiting-gil") && t.legs[t.legIndex].kind === "cpu",
      );
      if (candidate) {
        candidate.status = "running";
        candidate.coreId = this.nextLane++ % this.coreCount;
        if (candidate.startedAt === null) candidate.startedAt = this.now;
        candidate.gilSliceRemainingMs = this.gilQuantumMs;
        this.gil.holderId = candidate.id;
        this.gil.switches++;
        this.stats.gilSwitches++;
        this.addLog("info", `T${candidate.id} acquired the GIL (core ${candidate.coreId})`);
      }
    } else {
      holder.legRemainingMs -= deltaMs;
      holder.gilSliceRemainingMs -= deltaMs;
      if (holder.legRemainingMs <= 0) {
        holder.coreId = null;
        this.gil.holderId = null; // release before advancing so the next task can grab it next tick
        this.advanceLeg(holder);
      } else if (
        holder.gilSliceRemainingMs <= 0 &&
        this.tasks.some(
          (t) =>
            t.id !== holder.id &&
            (t.status === "queued" || t.status === "waiting-gil") &&
            t.legs[t.legIndex].kind === "cpu",
        )
      ) {
        // Forced yield only when contended — no fake handoffs when nobody's waiting.
        holder.status = "waiting-gil";
        holder.coreId = null;
        this.gil.holderId = null;
        this.addLog("info", `T${holder.id}'s GIL quantum expired — yielding (contended)`);
      }
    }

    for (const t of this.tasks) {
      if (t.status === "waiting-io") {
        t.legRemainingMs -= deltaMs;
        if (t.legRemainingMs <= 0) this.advanceLeg(t); // -> waiting-gil (needs the GIL again) or done
      }
    }
  }

  /**
   * Each task pinned 1:1 to a core for its whole life once assigned,
   * including through I/O waits — deliberately: this is what makes
   * "I/O-bound multiprocessing burns a whole dedicated core at low
   * busy%" visible without modeling OS preemption of blocked processes.
   * No GIL involvement at all — every core with a `running` occupant is
   * truly, simultaneously executing.
   */
  private tickMultiprocessing(deltaMs: number) {
    for (const core of this.cores) {
      const occupant = this.tasks.find((t) => t.coreId === core.id && t.status !== "done");
      if (occupant) continue;
      const next = this.tasks.find((t) => t.status === "queued");
      if (next) {
        next.status = "spawning";
        next.coreId = core.id;
        next.spawnRemainingMs = this.spawnOverheadMs;
        this.addLog("info", `P${next.id} spawning on core ${core.id} (+${this.spawnOverheadMs}ms overhead)`);
      }
    }

    for (const t of this.tasks) {
      if (t.status === "spawning") {
        t.spawnRemainingMs -= deltaMs;
        if (t.spawnRemainingMs <= 0) {
          t.status = "running";
          t.startedAt = this.now;
        }
      } else if (t.status === "running" || t.status === "waiting-io") {
        t.legRemainingMs -= deltaMs;
        if (t.legRemainingMs <= 0) this.advanceLeg(t); // -> waiting-io (same core) or running (next cpu leg, same core) or done
      }
    }
  }

  tick(deltaMs: number) {
    this.now += deltaMs;

    switch (this.mode) {
      case "sequential":
        this.tickSequential(deltaMs);
        break;
      case "concurrent":
        this.tickConcurrentSingleCore(deltaMs);
        break;
      case "multithreading":
        this.tickMultithreading(deltaMs);
        break;
      case "multiprocessing":
        this.tickMultiprocessing(deltaMs);
        break;
    }

    for (const core of this.cores) {
      const running = this.tasks.some((t) => t.coreId === core.id && t.status === "running");
      if (running) core.busyMs += deltaMs;
    }

    for (const t of this.tasks) {
      if (t.status === "waiting-gil") this.stats.gilWaitTotalMs += deltaMs;
    }

    if (this.stats.runFinishedAt === null && this.stats.spawned > 0 && this.tasks.every((t) => t.status === "done")) {
      this.stats.runFinishedAt = this.now;
      const wallClock = Math.round(this.now - (this.stats.runStartedAt ?? this.now));
      this.addLog("info", `Run finished — ${this.stats.completed}/${this.stats.spawned} tasks done in ${wallClock}ms wall clock`);
    }
  }

  getSnapshot(): SimSnapshot {
    const runStartedAt = this.stats.runStartedAt;
    const wallClockMs = runStartedAt === null ? 0 : (this.stats.runFinishedAt ?? this.now) - runStartedAt;
    const coreBusyPct = this.cores.map((c) => (wallClockMs > 0 ? (c.busyMs / wallClockMs) * 100 : 0));

    return {
      now: this.now,
      mode: this.mode,
      workload: this.workload,
      coreCount: this.coreCount,
      gilQuantumMs: this.gilQuantumMs,
      spawnOverheadMs: this.spawnOverheadMs,
      cores: this.cores.map((c) => ({ ...c })),
      tasks: this.tasks.map((t) => ({ ...t })),
      gil: { ...this.gil },
      log: [...this.log],
      stats: { ...this.stats },
      wallClockMs,
      coreBusyPct,
    };
  }
}
