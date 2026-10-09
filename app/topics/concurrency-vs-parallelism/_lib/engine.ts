import type {
  Core,
  CoreSpan,
  CoreSpanKind,
  LogEntry,
  Phase,
  RunResult,
  Scheduling,
  Segment,
  SimSnapshot,
  Task,
  TaskSpan,
  TaskSpanKind,
  Workload,
} from "./types";

/** The scheduler advances in fixed steps of simulated time, so a run is deterministic regardless of frame rate. */
const STEP_MS = 10;

/**
 * Cost of moving a core from one task to another. Real switches take a few
 * microseconds against millisecond time slices; this is exaggerated (~13% of
 * a slice) so the overhead is visible on the timeline, not hidden in a pixel.
 */
export const SWITCH_MS = 40;
/** How long a task may hold a core in concurrent mode before it's preempted, if another task is waiting. */
export const QUANTUM_MS = 300;
export const MAX_CORES = 4;
export const TASK_COUNT = 6;
/** Speeds offered in the controls; 1× is real time. */
export const SPEEDS = [0.5, 1, 2] as const;

const MAX_LOG = 120;
const MAX_RUNS = 8;

const cpu = (ms: number): Segment => ({ kind: "cpu", ms });
const io = (ms: number): Segment => ({ kind: "io", ms });

/**
 * Fixed, deliberately uneven tasks per workload, so every combination of
 * scheduling and cores is run against literally the same work and the wall
 * clocks are directly comparable.
 */
export const WORKLOADS: Record<Workload, readonly (readonly Segment[])[]> = {
  /** Pure computation: resizing images, hashing passwords. Nothing ever waits. */
  cpu: [[cpu(1400)], [cpu(900)], [cpu(1600)], [cpu(1100)], [cpu(1300)], [cpu(1000)]],
  /** Web requests: a little CPU to parse, a long wait on a database or API, a little CPU to respond. */
  io: [
    [cpu(150), io(1200), cpu(150)],
    [cpu(150), io(900), cpu(150)],
    [cpu(150), io(1500), cpu(150)],
    [cpu(150), io(1000), cpu(150)],
    [cpu(150), io(1300), cpu(150)],
    [cpu(150), io(800), cpu(150)],
  ],
  /** Half and half: some tasks crunch, some mostly wait. */
  mixed: [
    [cpu(1200)],
    [cpu(100), io(1000), cpu(100)],
    [cpu(300), io(600), cpu(500)],
    [cpu(1000)],
    [cpu(150), io(1200), cpu(150)],
    [cpu(400), io(400), cpu(400)],
  ],
};

export const WORKLOAD_LABEL: Record<Workload, string> = {
  cpu: "CPU-bound",
  io: "I/O-bound",
  mixed: "Mixed",
};

/** The four quadrants of "is it concurrent?" × "is it parallel?". */
export function quadrantLabel(scheduling: Scheduling, cores: number) {
  if (scheduling === "blocking") return cores === 1 ? "Sequential" : "Parallel";
  return cores === 1 ? "Concurrent" : "Concurrent + parallel";
}

export const taskLabel = (id: number) => `T${id + 1}`;
export const coreLabel = (id: number) => `Core ${id + 1}`;

export function formatSeconds(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}

type SchedulerEvent = { level: LogEntry["level"]; message: string; time: number };

/**
 * One run of one workload under one configuration, stepped in fixed
 * increments. Knows nothing about playback speed, pausing or history —
 * `ConcurrencyEngine` wraps it for that, and `simulateRun` drives it straight
 * to the end for baselines and the Study page.
 *
 * Each step: charge the step's time to whatever every core and task is doing
 * (recording it on the timeline), then apply transitions — segments that just
 * ended, preemption — then hand free cores to the head of the ready queue.
 */
class Scheduler {
  readonly scheduling: Scheduling;
  readonly coreCount: number;

  now = 0;
  tasks: Task[];
  cores: Core[];
  coreSpans: CoreSpan[] = [];
  taskSpans: TaskSpan[] = [];
  switches = 0;
  cpuMs = 0;
  blockedMs = 0;

  /** Task ids waiting for a core, FIFO. */
  private queue: number[];
  private emit: (e: SchedulerEvent) => void;

  constructor(workload: Workload, scheduling: Scheduling, cores: number, emit: (e: SchedulerEvent) => void = () => {}) {
    this.scheduling = scheduling;
    this.coreCount = cores;
    this.emit = emit;
    this.tasks = WORKLOADS[workload].map((segments, id) => ({
      id,
      segments,
      seg: 0,
      segLeft: segments[0].ms,
      state: "ready",
      core: null,
      finishedAt: null,
    }));
    this.cores = Array.from({ length: cores }, (_, id) => ({
      id,
      task: null,
      lastTask: null,
      switchLeft: 0,
      sliceUsed: 0,
    }));
    this.queue = this.tasks.map((t) => t.id);
    this.dispatch();
  }

  private say(e: Omit<SchedulerEvent, "time">) {
    this.emit({ ...e, time: this.now });
  }

  get finished() {
    return this.tasks.every((t) => t.state === "done");
  }

  step() {
    const start = this.now;
    const end = start + STEP_MS;

    // 1. Charge this step to whatever each core is doing.
    for (const core of this.cores) {
      if (core.task === null) continue;
      const task = this.tasks[core.task];
      if (core.switchLeft > 0) {
        core.switchLeft -= STEP_MS;
        this.recordCore(core.id, task.id, "switch", start, end);
        continue;
      }
      if (task.state === "running") {
        task.segLeft -= STEP_MS;
        core.sliceUsed += STEP_MS;
        this.cpuMs += STEP_MS;
        this.recordCore(core.id, task.id, "cpu", start, end);
      } else if (task.state === "io") {
        // Blocking mode only: the core is held but has nothing to do.
        this.blockedMs += STEP_MS;
        this.recordCore(core.id, task.id, "blocked", start, end);
      }
    }
    // I/O happens off-core (the disk, the network, another server), so every waiting task makes progress at once.
    for (const task of this.tasks) {
      if (task.state === "io") task.segLeft -= STEP_MS;
      if (task.state !== "done") this.recordTask(task.id, task.state === "running" ? "cpu" : task.state, start, end);
    }
    this.now = end;

    // 2. Transitions.
    for (const core of this.cores) {
      if (core.task === null || core.switchLeft > 0) continue;
      const task = this.tasks[core.task];
      // A switch that just completed: the task is now actually on the core.
      if (task.state === "ready") task.state = "running";
    }
    for (const task of this.tasks) {
      if ((task.state === "running" || task.state === "io") && task.segLeft <= 0) this.advance(task);
    }
    if (this.scheduling === "concurrent") this.preempt();

    // 3. Hand free cores to waiting tasks.
    this.dispatch();
  }

  /** The current segment just ended: move to the next one, or finish. */
  private advance(task: Task) {
    task.seg += 1;
    const core = task.core === null ? null : this.cores[task.core];

    if (task.seg >= task.segments.length) {
      task.state = "done";
      task.finishedAt = this.now;
      if (core) this.release(core);
      this.say({ level: "info", message: `${taskLabel(task.id)} done at ${formatSeconds(this.now)}` });
      return;
    }

    const next = task.segments[task.seg];
    task.segLeft = next.ms;

    if (next.kind === "io") {
      task.state = "io";
      if (this.scheduling === "concurrent" && core) {
        this.release(core);
        this.say({
          level: "info",
          message: `${taskLabel(task.id)} waits on I/O (${next.ms}ms), ${coreLabel(core.id)} lets go of it`,
        });
      } else if (core) {
        this.say({
          level: "warn",
          message: `${taskLabel(task.id)} waits on I/O (${next.ms}ms), ${coreLabel(core.id)} blocked with it`,
        });
      }
      return;
    }

    // Next segment is CPU.
    if (core) {
      task.state = "running";
    } else {
      task.state = "ready";
      this.queue.push(task.id);
      this.say({ level: "info", message: `${taskLabel(task.id)} I/O finished, back in the ready queue` });
    }
  }

  /** Concurrent mode: a task that has used its whole time slice goes to the back of the queue, if anyone's waiting. */
  private preempt() {
    if (this.queue.length === 0) return;
    for (const core of this.cores) {
      if (core.task === null || core.switchLeft > 0 || core.sliceUsed < QUANTUM_MS) continue;
      if (this.queue.length === 0) return;
      const task = this.tasks[core.task];
      if (task.state !== "running") continue;
      task.state = "ready";
      this.release(core);
      this.queue.push(task.id);
      this.say({ level: "info", message: `${taskLabel(task.id)} preempted after a ${QUANTUM_MS}ms slice` });
    }
  }

  private release(core: Core) {
    const task = core.task === null ? null : this.tasks[core.task];
    if (task) task.core = null;
    core.task = null;
    core.sliceUsed = 0;
  }

  private dispatch() {
    for (const core of this.cores) {
      if (core.task !== null) continue;
      const id = this.queue.shift();
      if (id === undefined) return;
      const task = this.tasks[id];
      task.core = core.id;
      core.task = id;
      core.sliceUsed = 0;
      // Loading a core's very first task, or resuming the one it just ran, costs nothing.
      const switching = core.lastTask !== null && core.lastTask !== id;
      core.lastTask = id;
      if (switching) {
        core.switchLeft = SWITCH_MS;
        this.switches += 1;
        task.state = "ready";
      } else {
        task.state = "running";
      }
      this.say({ level: "info", message: `${coreLabel(core.id)} picks up ${taskLabel(id)}` });
    }
  }

  /** Spans are replaced, never mutated, so a snapshot's shallow copy can't change under React. */
  private recordCore(core: number, task: number, kind: CoreSpanKind, start: number, end: number) {
    for (let i = this.coreSpans.length - 1; i >= 0; i--) {
      const s = this.coreSpans[i];
      if (s.core !== core) continue;
      if (s.task === task && s.kind === kind && s.end === start) {
        this.coreSpans[i] = { ...s, end };
        return;
      }
      break;
    }
    this.coreSpans.push({ core, task, kind, start, end });
  }

  private recordTask(task: number, kind: TaskSpanKind, start: number, end: number) {
    for (let i = this.taskSpans.length - 1; i >= 0; i--) {
      const s = this.taskSpans[i];
      if (s.task !== task) continue;
      if (s.kind === kind && s.end === start) {
        this.taskSpans[i] = { ...s, end };
        return;
      }
      break;
    }
    this.taskSpans.push({ task, kind, start, end });
  }
}

export interface RunSummary {
  wallMs: number;
  cpuMs: number;
  blockedMs: number;
  switches: number;
  utilization: number;
  blocked: number;
}

/** Runs one configuration straight to the end. Used for the sequential baseline and by the Study page. */
export function simulateRun(workload: Workload, scheduling: Scheduling, cores: number): RunSummary {
  const s = new Scheduler(workload, scheduling, cores);
  while (!s.finished) s.step();
  return summarize(s);
}

function summarize(s: Scheduler): RunSummary {
  const coreTime = s.now * s.coreCount;
  return {
    wallMs: s.now,
    cpuMs: s.cpuMs,
    blockedMs: s.blockedMs,
    switches: s.switches,
    utilization: coreTime === 0 ? 0 : s.cpuMs / coreTime,
    blocked: coreTime === 0 ? 0 : s.blockedMs / coreTime,
  };
}

const baselineCache = new Map<Workload, { baselineMs: number; axisMs: number }>();

/**
 * Sequential wall time, and an axis wide enough for the slowest possible
 * configuration (1 core, concurrent, which pays for its switches) — more
 * cores only ever shorten a run.
 */
export function workloadScale(workload: Workload) {
  let cached = baselineCache.get(workload);
  if (!cached) {
    const baselineMs = simulateRun(workload, "blocking", 1).wallMs;
    const slowest = Math.max(baselineMs, simulateRun(workload, "concurrent", 1).wallMs);
    cached = { baselineMs, axisMs: Math.ceil((slowest * 1.03) / 500) * 500 };
    baselineCache.set(workload, cached);
  }
  return cached;
}

let logId = 0;
let runId = 0;

/**
 * Owns the Simulate page's state: the current configuration, one in-progress
 * `Scheduler` run, playback (speed, pause) and the history of finished runs.
 * Mutated in place on every `tick()`; `getSnapshot()` is the only thing that
 * leaves it (see the load-balancer topic's `use-simulation.ts` for why this
 * stays a plain mutable class outside React).
 *
 * Nothing runs until `run()` is called — a first-time visitor lands on an
 * empty timeline and starts it deliberately (design system §13).
 */
export class ConcurrencyEngine {
  workload: Workload = "io";
  scheduling: Scheduling = "blocking";
  cores = 1;
  speed = 1;
  phase: Phase = "idle";
  runs: RunResult[] = [];
  log: LogEntry[] = [];

  private sched: Scheduler;
  /** Simulated ms owed to the scheduler but not yet stepped — keeps playback smooth at any speed. */
  private carry = 0;
  private reducedMotion = false;

  constructor() {
    this.sched = this.freshScheduler();
  }

  setReducedMotion(v: boolean) {
    this.reducedMotion = v;
  }

  setWorkload(w: Workload) {
    if (w === this.workload) return;
    this.workload = w;
    this.resetRun();
  }

  setScheduling(s: Scheduling) {
    if (s === this.scheduling) return;
    this.scheduling = s;
    this.resetRun();
  }

  setCores(n: number) {
    const cores = Math.max(1, Math.min(MAX_CORES, Math.round(n)));
    if (cores === this.cores) return;
    this.cores = cores;
    this.resetRun();
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  /** Start, resume, or (after a finished run) start over with the same settings. */
  run() {
    if (this.phase === "done") this.resetRun();
    if (this.phase === "idle") {
      this.pushLog(
        "info",
        `Run: ${WORKLOAD_LABEL[this.workload]}, ${this.scheduling}, ${this.cores} core${this.cores === 1 ? "" : "s"}`,
      );
    }
    this.phase = "running";
    // Reduced motion: no animated playback, just the finished timeline (design system §12).
    if (this.reducedMotion) this.finishNow();
  }

  pause() {
    if (this.phase === "running") this.phase = "paused";
  }

  /** Configure and run in one go — the "Try it" cards. */
  runScenario(workload: Workload, scheduling: Scheduling, cores: number) {
    this.workload = workload;
    this.scheduling = scheduling;
    this.cores = cores;
    this.resetRun();
    this.run();
  }

  /** Back to an empty timeline with the same settings. Run history is kept. */
  resetRun() {
    this.phase = "idle";
    this.sched = this.freshScheduler();
    this.carry = 0;
  }

  clearRuns() {
    this.runs = [];
  }

  tick(deltaMs: number) {
    if (this.phase !== "running") return;
    this.carry += deltaMs * this.speed;
    while (this.carry >= STEP_MS && this.phase === "running") {
      this.carry -= STEP_MS;
      this.stepOnce();
    }
  }

  private finishNow() {
    while (this.phase === "running") this.stepOnce();
  }

  private stepOnce() {
    this.sched.step();
    if (this.sched.finished) this.complete();
  }

  private complete() {
    this.phase = "done";
    this.carry = 0;
    const summary = summarize(this.sched);
    const { baselineMs } = workloadScale(this.workload);
    const speedup = baselineMs / summary.wallMs;
    this.runs = [
      {
        id: runId++,
        workload: this.workload,
        scheduling: this.scheduling,
        cores: this.cores,
        wallMs: summary.wallMs,
        speedup,
        utilization: summary.utilization,
        blocked: summary.blocked,
        switches: summary.switches,
      },
      ...this.runs,
    ].slice(0, MAX_RUNS);
    this.pushLog(
      speedup >= 1 ? "info" : "warn",
      `Finished in ${formatSeconds(summary.wallMs)}: ${speedup.toFixed(2)}× vs sequential, ${summary.switches} context switches`,
    );
  }

  private freshScheduler() {
    return new Scheduler(this.workload, this.scheduling, this.cores, (e) => {
      // The first dispatch happens as soon as a run is set up; the "Run: …" line covers it.
      if (this.phase !== "idle") this.pushLog(e.level, e.message, e.time);
    });
  }

  /** `time` is ms into the current run, so lines read as "1.2s into this run". */
  private pushLog(level: LogEntry["level"], message: string, time = this.sched.now) {
    this.log.push({ id: logId++, time, level, message });
    if (this.log.length > MAX_LOG) this.log.splice(0, this.log.length - MAX_LOG);
  }

  getSnapshot(): SimSnapshot {
    const s = this.sched;
    const { baselineMs, axisMs } = workloadScale(this.workload);
    return {
      phase: this.phase,
      workload: this.workload,
      scheduling: this.scheduling,
      cores: this.cores,
      speed: this.speed,
      now: s.now,
      tasks: s.tasks.map((t) => ({ ...t })),
      coreStates: s.cores.map((c) => ({ ...c })),
      coreSpans: s.coreSpans.slice(),
      taskSpans: s.taskSpans.slice(),
      switches: s.switches,
      cpuMs: s.cpuMs,
      blockedMs: s.blockedMs,
      baselineMs,
      axisMs,
      runs: this.runs,
      log: this.log.slice(),
    };
  }
}
