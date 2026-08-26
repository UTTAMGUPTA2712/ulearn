import type { Metadata } from "next";

import { ComparisonTable } from "@/components/study/comparison-table";
import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";
import { TableOfContents } from "@/components/study/table-of-contents";

export const metadata: Metadata = {
  title: "Concurrency vs Parallelism · Study",
};

const SECTIONS = [
  "Concurrency vs parallelism",
  "Threads vs processes",
  "What the GIL actually locks",
  "When multithreading helps despite the GIL",
  "When multiprocessing wins",
];

export default function ConcurrencyStudyPage() {
  return (
    <div className="mx-auto flex max-w-[67rem] gap-12">
      <div className="min-w-0 max-w-3xl flex-1 space-y-8">
        <Section title="Concurrency vs parallelism">
          <p>
            These two words get used interchangeably, but they answer different questions. Concurrency is about{" "}
            <em>structure</em>: dealing with more than one thing at a time, by breaking work into independently
            progressing units that can be paused and resumed. Parallelism is about <em>execution</em>: literally
            doing more than one thing at the same instant, which requires more than one core.
          </p>
          <p>
            The simulator makes the gap concrete. Sequential and Concurrent modes both run on a single core, so
            neither one is ever truly parallel — but switch from Sequential to Concurrent and watch the one lane
            start interleaving between tasks instead of finishing one before starting the next. That&apos;s
            concurrency with zero parallelism: nothing is happening simultaneously, work is just no longer strictly
            ordered.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Concurrency">
              Structuring a program so multiple tasks can be in progress at once — interleaved on one core, or
              spread across many. A property of how the work is organized, independent of how many cores exist.
            </ConceptCard>
            <ConceptCard name="Parallelism">
              Actually executing more than one task at the exact same instant. Requires multiple cores — you cannot
              get real parallelism out of a single core no matter how the scheduler interleaves work on it.
            </ConceptCard>
          </div>
        </Section>

        <Section title="Threads vs processes">
          <p>
            Both are ways of getting more than one thing running. A thread lives inside a process and shares its
            memory — cheap to create, cheap to hand data between threads, but a data race away from corrupting
            shared state if two threads touch it without coordination. A process is its own isolated address
            space — safe by construction, since one process can&apos;t reach into another&apos;s memory by accident, but
            sharing anything between processes means explicit inter-process communication (IPC): serializing data,
            sending it across a pipe or socket, deserializing it on the other end.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Thread">
              Shares the parent process&apos;s memory and file handles. Creating one is cheap — no new memory space,
              no new interpreter. The tradeoff is that shared mutable state needs explicit locking to stay correct.
            </ConceptCard>
            <ConceptCard name="Process">
              Its own memory space, its own interpreter instance. Isolated by default — nothing to lock, because
              there&apos;s nothing shared. The tradeoff shows up at creation and communication time, not at runtime.
            </ConceptCard>
            <ConceptCard name="Why spawning a process costs more">
              The OS has to allocate a fresh address space and, for something like CPython, start a whole new
              interpreter inside it, before the process can run a single line of code. A thread skips all of that.
              Toggle the simulator&apos;s <strong>spawn overhead</strong> slider under Multiprocessing and watch
              wall-clock time move with it — that overhead is real, not hand-waved.
            </ConceptCard>
          </div>
        </Section>

        <Section title="What the GIL actually locks">
          <p>
            The Global Interpreter Lock is specific to CPython (the reference Python implementation) — it is not a
            universal feature of &ldquo;threading&rdquo; as a concept. It ensures only one thread executes Python{" "}
            <em>bytecode</em> at a time, full stop, regardless of how many CPU cores the machine has. It does not
            lock I/O, and it does not lock C extensions that explicitly release it around a blocking call (which is
            exactly what most I/O-bound libraries do).
          </p>
          <p>
            This is where &ldquo;Python can&apos;t use multiple cores&rdquo; gets overstated. It&apos;s true for CPU-bound work
            done with threads — the GIL means only one thread&apos;s Python bytecode ever runs at once, so adding
            threads can&apos;t speed up pure computation. It&apos;s false for CPU-bound work done with processes: each
            process gets its own interpreter and its own GIL, so multiprocessing genuinely uses every core. And it
            doesn&apos;t apply at all to other languages — Java and Go threads have no such lock.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="What holds the GIL">
              Whichever thread is currently executing Python bytecode. In the simulator, that&apos;s the one lane the
              padlock icon is hovering over — there is never more than one, which is the entire mechanism.
            </ConceptCard>
            <ConceptCard name="What releases it">
              A thread gives up the GIL periodically on its own (a configurable interval — the simulator&apos;s{" "}
              <strong>GIL quantum</strong> slider), and also whenever it blocks on I/O, letting another thread run
              during the wait instead of sitting idle behind the lock.
            </ConceptCard>
            <ConceptCard name="Not every language has one">
              The GIL is a CPython implementation detail, not a law of threading. Languages without a global
              interpreter lock — Java, Go, Rust — can run CPU-bound work across multiple threads in true parallel.
            </ConceptCard>
          </div>
        </Section>

        <Section title="When multithreading helps despite the GIL">
          <p>
            Blocking I/O — waiting on a network response, a disk read, a database query — releases the GIL for the
            duration of the wait, so another thread can run while the first one is blocked. That&apos;s exactly the
            case multithreading is good at, GIL and all.
          </p>
          <p>
            Try it: set Workload to <strong>I/O-bound</strong>, switch Mode to <strong>Multithreading</strong>, and
            run a burst. Wall-clock time drops toward roughly one task&apos;s own critical path instead of the sum of
            every task&apos;s time — the other threads made progress on their I/O waits while each held the CPU only
            briefly. Now switch Mode to <strong>Concurrent</strong> and run the same workload again: you&apos;ll see
            almost the same win, on a single lane, with no threads at all. That&apos;s not a coincidence — it&apos;s exactly
            why event-loop / <code>asyncio</code>-style concurrency exists as an alternative to threading for
            I/O-bound work.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="I/O-bound work">
              Work whose time is dominated by waiting, not computing — a network call, a disk read, a query. The
              CPU is idle for most of the task&apos;s lifetime, which is exactly the idle time another task can use.
            </ConceptCard>
            <ConceptCard name="async as the alternative">
              An event loop gets the same overlap-during-I/O-wait benefit as threading, without needing threads (or
              a GIL to contend with) at all — one thread, many in-flight tasks, switching between them at each
              await point instead of at a forced time-slice boundary.
            </ConceptCard>
          </div>
        </Section>

        <Section title="When multiprocessing wins">
          <p>
            For CPU-bound work, there is no GIL between processes — each one has its own interpreter, so every
            process can genuinely execute at the same instant on its own core. Set Workload to{" "}
            <strong>CPU-bound</strong> and switch between Multithreading and Multiprocessing: Multithreading&apos;s
            wall clock sits close to Sequential&apos;s, because the GIL serializes the CPU work regardless of core
            count. Multiprocessing&apos;s drops sharply, scaling down roughly with the number of cores you give it.
          </p>
          <p>
            That parallelism isn&apos;t free, though. Flip Workload back to <strong>I/O-bound</strong> under
            Multiprocessing and watch it lose ground to Multithreading (or Concurrent) — it&apos;s paying real
            spawn overhead per process for parallel execution the workload didn&apos;t actually need, since the
            bottleneck was waiting, not computing.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="True parallel execution">
              Every core running a different process&apos;s Python bytecode at the same instant — nothing serializes
              it, because there&apos;s no shared interpreter lock across processes.
            </ConceptCard>
            <ConceptCard name="The overhead you're paying for it">
              Every process pays a startup cost before it runs a line of code, and communicating between processes
              needs explicit IPC instead of just sharing a variable. Multiprocessing wins when the CPU work it
              unlocks outweighs that cost — and loses when it doesn&apos;t.
            </ConceptCard>
            <ConceptCard name="Shared-nothing means no data races">
              Because processes don&apos;t share memory, there&apos;s nothing for two processes to corrupt by touching at
              once — the isolation that makes IPC necessary is the same isolation that makes multiprocessing safe
              by default, where multithreading needs explicit locks around shared state.
            </ConceptCard>
          </div>
        </Section>

        <ComparisonTable
          columns={["Threading", "Multiprocessing"]}
          rows={[
            { label: "Memory", values: ["Shared address space", "Isolated — needs IPC to share anything"] },
            {
              label: "GIL-bound (CPython)?",
              values: ["Yes — one thread runs Python bytecode at a time", "No — each process has its own interpreter/GIL"],
            },
            { label: "Startup cost", values: ["Cheap — microseconds", "Expensive — a real OS process spawn"] },
            { label: "Best for", values: ["I/O-bound work (GIL released during I/O)", "CPU-bound work (true parallel execution)"] },
            {
              label: "Failure isolation",
              values: ["One thread crashing can take the whole process down", "One process crashing doesn't touch the others"],
            },
          ]}
        />
      </div>

      <TableOfContents sections={SECTIONS} />
    </div>
  );
}
