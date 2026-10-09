import type { GlossaryEntry } from "@/components/study/term";

/**
 * Single source of truth for every term this topic uses across Simulate and
 * Study. The `/glossary` tab renders this whole list; every inline `<Term>`
 * popover elsewhere looks a definition up from this same array.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "concurrency",
    term: "Concurrency",
    definition:
      "Structuring a program so several tasks are in progress at once and can make progress whenever they're able to, by taking turns. It's about dealing with many things at once. It doesn't need more than one core.",
  },
  {
    id: "parallelism",
    term: "Parallelism",
    definition:
      "Actually executing several things at the same instant, on separate cores or machines. It's about doing many things at once. It needs hardware: one core can't be parallel.",
  },
  {
    id: "sequential",
    term: "Sequential execution",
    definition:
      "One task at a time, start to finish, in order. The next task doesn't begin until the previous one is completely done, even if the previous one is just waiting.",
  },
  {
    id: "cpu-bound",
    term: "CPU-bound",
    definition:
      "Work whose speed is limited by computation: image resizing, compression, password hashing. It never waits, so the only way to finish it sooner is more cores.",
  },
  {
    id: "io-bound",
    term: "I/O-bound",
    definition:
      "Work that spends most of its time waiting on something outside the CPU: a database, a disk, another service over the network. Most web servers are I/O-bound.",
  },
  {
    id: "blocking",
    term: "Blocking",
    definition:
      "A call that doesn't return until its result is ready. A thread that makes a blocking database call holds on to its core (or at least its stack and its place) and does nothing else until the answer comes back.",
  },
  {
    id: "non-blocking",
    term: "Non-blocking / async I/O",
    definition:
      "Starting an I/O operation and getting control back immediately, with the result delivered later (a callback, a promise, an await). The task steps aside while it waits so something else can use the core.",
  },
  {
    id: "context-switch",
    term: "Context switch",
    definition:
      "Saving one task's state (registers, stack pointer, sometimes memory mappings) and loading another's so a core can run it. Pure overhead: no task makes progress during it, and it cools the CPU caches.",
  },
  {
    id: "time-slice",
    term: "Time slice (quantum)",
    definition:
      "How long a scheduler lets a task run before checking whether someone else should have a turn. Here it's 300ms; real OS schedulers use a few milliseconds.",
  },
  {
    id: "preemption",
    term: "Preemption",
    definition:
      "The scheduler taking a core away from a running task, usually because its time slice ran out, so one long computation can't starve everything else. The opposite is cooperative scheduling, where tasks only give up the core when they choose to (for example at an await).",
  },
  {
    id: "ready-queue",
    term: "Ready queue",
    definition:
      "Tasks that could run right now if a core were free. A task joins it when it's created, when its I/O finishes, or when it's preempted, and leaves it when the scheduler hands it a core.",
  },
  {
    id: "utilization",
    term: "CPU utilization",
    definition:
      "The share of available core time actually spent computing. A core that's idle, switching, or held by a task that's waiting on I/O counts as unused.",
  },
  {
    id: "speedup",
    term: "Speedup",
    definition:
      "How many times faster a run finished than the same work run sequentially on one core. 2× means half the wall-clock time.",
  },
  {
    id: "wall-clock",
    term: "Wall-clock time",
    definition:
      "Real elapsed time from start to finish, as a clock on the wall would measure it. Different from CPU time, which only counts time a core spent computing and adds up across cores.",
  },
  {
    id: "thread",
    term: "Thread",
    definition:
      "An independent sequence of execution inside a process, with its own stack but sharing the process's memory. Cheap to create and to switch between, and able to touch each other's data, which is both the point and the danger.",
  },
  {
    id: "process",
    term: "Process",
    definition:
      "A running program with its own private memory. Processes can't corrupt each other's data by accident, but talking between them means copying data through pipes, sockets or shared-memory segments, and each one costs more to start.",
  },
  {
    id: "event-loop",
    term: "Event loop",
    definition:
      "A single thread that runs whichever task is ready, and when that task starts waiting on I/O, parks it and moves on. Node.js, Python's asyncio and browser JavaScript all work this way: concurrency on one core without threads.",
  },
  {
    id: "gil",
    term: "GIL (Global Interpreter Lock)",
    definition:
      "A lock in CPython (and Ruby's MRI) that lets only one thread execute interpreter code at a time. Threads still help with I/O, which releases the lock, but CPU-bound Python threads can't run in parallel; you need processes for that.",
  },
  {
    id: "amdahl",
    term: "Amdahl's law",
    definition:
      "If a fraction p of a job can run in parallel, N cores give at most 1 / ((1 − p) + p / N) speedup. The serial part sets a ceiling: with p = 0.9, even infinite cores top out at 10×.",
  },
  {
    id: "race-condition",
    term: "Race condition",
    definition:
      "A bug where the result depends on how concurrent tasks happen to interleave. Two threads both read a counter as 41, both add one, both write 42: one increment vanished.",
  },
  {
    id: "lock",
    term: "Lock (mutex)",
    definition:
      "A guard that only one task can hold at a time, so a sequence of steps on shared data happens as a unit. Correct use prevents races; holding one too long turns parallel code back into sequential code.",
  },
  {
    id: "deadlock",
    term: "Deadlock",
    definition:
      "Two or more tasks each holding a lock the other needs, so all of them wait forever. The usual fix is to always acquire locks in the same order.",
  },
];
