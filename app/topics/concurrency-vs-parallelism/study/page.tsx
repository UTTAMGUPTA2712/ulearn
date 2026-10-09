import type { Metadata } from "next";

import { ComparisonTable } from "@/components/study/comparison-table";
import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";
import { TableOfContents } from "@/components/study/table-of-contents";
import { TopicLink } from "@/components/topic/topic-link";
import { topicMetadata } from "@/lib/seo";

import {
  MAX_CORES,
  QUANTUM_MS,
  SWITCH_MS,
  WORKLOAD_LABEL,
  formatSeconds,
  quadrantLabel,
  simulateRun,
} from "../_lib/engine";
import type { Scheduling, Workload } from "../_lib/types";

export const metadata: Metadata = topicMetadata("concurrency-vs-parallelism", "study");

const SECTIONS = [
  "Two different questions",
  "The four quadrants",
  "Waiting is the whole story",
  "Context switches aren't free",
  "Amdahl's law: the ceiling on cores",
  "Threads, processes and event loops",
  "Shared state: what concurrency costs",
  "Choosing in practice",
];

/**
 * Every timing on this page comes from running the simulation's own engine at
 * build time, so the page and the Simulate tab can't disagree.
 */
const CONFIGS: { scheduling: Scheduling; cores: number }[] = [
  { scheduling: "blocking", cores: 1 },
  { scheduling: "concurrent", cores: 1 },
  { scheduling: "blocking", cores: MAX_CORES },
  { scheduling: "concurrent", cores: MAX_CORES },
];
const WORKLOADS: Workload[] = ["cpu", "io", "mixed"];

const RESULTS = Object.fromEntries(
  WORKLOADS.map((w) => [w, CONFIGS.map((c) => simulateRun(w, c.scheduling, c.cores))]),
) as Record<Workload, ReturnType<typeof simulateRun>[]>;

const ioSeq = RESULTS.io[0];
const ioConc = RESULTS.io[1];
const ioPar = RESULTS.io[2];
const cpuSeq = RESULTS.cpu[0];
const cpuConc = RESULTS.cpu[1];
const cpuPar = RESULTS.cpu[2];

const pct = (x: number) => `${Math.round(x * 100)}%`;
const speedup = (base: number, t: number) => `${(base / t).toFixed(1)}×`;

const amdahl = (p: number, n: number) => 1 / (1 - p + p / n);
const AMDAHL_P = [0.5, 0.9, 0.95, 0.99];
const AMDAHL_N = [2, 4, 8, 16, 64];

const RACE_SOURCE = `let views = 0;

// Two threads each run this 1,000 times.
function onPageView() {
  const current = views;   // both threads read 41
  views = current + 1;     // both write 42: one view lost
}`;

const FIX_SOURCE = `const lock = new Mutex();

async function onPageView() {
  await lock.acquire();
  try {
    views = views + 1;     // only one thread at a time in here
  } finally {
    lock.release();
  }
}`;

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-panel-raised px-1 font-mono text-text">{children}</code>;
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-panel-raised p-4 font-mono text-xs leading-relaxed text-text">
      {children}
    </pre>
  );
}

export default function ConcurrencyStudyPage() {
  return (
    <div className="mx-auto flex max-w-[67rem] gap-12">
      <div className="min-w-0 max-w-3xl flex-1 space-y-8">
        <Section title="Two different questions">
          <p>
            &ldquo;Concurrency is about <em>dealing</em>{" "}with lots of things at once. Parallelism is about{" "}
            <em>doing</em>{" "}lots of things at once.&rdquo; Rob Pike&apos;s line is quoted so often because the two
            words get used interchangeably, and they answer different questions.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Concurrency: a property of the program">
              <p>
                Is the work broken into independent tasks that can be paused and resumed, so that several of them are
                in progress at once? A single cook with three pans on the stove is concurrent: they flip one, stir
                another, and none of the dishes waits for the others to finish.
              </p>
            </ConceptCard>
            <ConceptCard name="Parallelism: a property of the execution">
              <p>
                Are several things physically happening at the same instant? That needs more than one worker: two
                cooks, two cores, two machines. A parallel program with one core available simply isn&apos;t
                parallel while it runs.
              </p>
            </ConceptCard>
          </div>
          <p>
            Concurrency is how you <em>structure</em>{" "}work; parallelism is one way that structure can be{" "}
            <em>executed</em>. A well-structured concurrent program can run on one core or sixty-four without
            changing. That&apos;s why the useful question is never &ldquo;concurrency or parallelism?&rdquo; but
            &ldquo;what is my work actually waiting for?&rdquo;
          </p>
        </Section>

        <Section title="The four quadrants">
          <p>
            Because they&apos;re independent, the two ideas make a 2×2, and every cell is a real way to run code. The
            Simulate tab lets you run each one. These are its wall-clock times for the same six tasks, with{" "}
            {MAX_CORES} cores on the right-hand side:
          </p>
          <ComparisonTable
            columns={CONFIGS.map((c) => `${quadrantLabel(c.scheduling, c.cores)} (${c.cores} core${c.cores === 1 ? "" : "s"})`)}
            rows={WORKLOADS.map((w) => ({
              label: WORKLOAD_LABEL[w],
              values: RESULTS[w].map((r, i) => (
                <span key={i} className="font-mono">
                  {formatSeconds(r.wallMs)}{" "}
                  <span className="text-text-faint">{speedup(RESULTS[w][0].wallMs, r.wallMs)}</span>
                </span>
              )),
            }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Sequential (neither)">
              <p>
                One task at a time, start to finish. A plain script with blocking calls. Simple to reason about, and
                fine whenever the work is small or genuinely has to happen in order.
              </p>
            </ConceptCard>
            <ConceptCard name="Concurrent, not parallel">
              <p>
                Many tasks in flight on one core, taking turns. Node.js, Python&apos;s <Code>asyncio</Code>, a
                single-core machine running a whole operating system. Huge wins for waiting, none for computing.
              </p>
            </ConceptCard>
            <ConceptCard name="Parallel, not concurrent">
              <p>
                Several workers each grinding through one task with no interleaving. A GPU applying one operation to
                a million pixels, SIMD instructions, a batch job split into N independent chunks on N machines.
              </p>
            </ConceptCard>
            <ConceptCard name="Concurrent and parallel">
              <p>
                Many tasks, many cores, and a scheduler mapping one onto the other. Go&apos;s goroutines, Java&apos;s
                thread pools, a modern OS. The default shape of any serious server.
              </p>
            </ConceptCard>
          </div>
        </Section>

        <Section title="Waiting is the whole story">
          <p>
            Look at the I/O-bound row. Each &ldquo;request&rdquo; does 300ms of computing around a 0.8–1.5s wait on
            a database. Sequentially, the core is held by a task that&apos;s doing nothing for{" "}
            <strong className="text-text">{pct(ioSeq.blocked)}</strong>{" "}of the run. Make it concurrent on the{" "}
            <em>same single core</em>{" "}and the run drops from {formatSeconds(ioSeq.wallMs)} to{" "}
            <strong className="text-text">{formatSeconds(ioConc.wallMs)}</strong>: the waits overlap, because
            waiting doesn&apos;t need a core. The disk, the network and the database server do that part.
          </p>
          <p>
            Now throw {MAX_CORES} cores at the same requests without concurrency: {formatSeconds(ioPar.wallMs)}.
            Parallelism helps, but each core still spends {pct(ioPar.blocked)} of its time blocked, and one
            concurrent core beats all {MAX_CORES} of them. This is why a single-threaded Node.js process can serve
            thousands of connections, and why the classic thread-per-request server needed thousands of threads to
            do the same.
          </p>
          <p>
            The CPU-bound row is the mirror image. Nothing waits, so there&apos;s nothing to overlap: one core
            concurrent takes {formatSeconds(cpuConc.wallMs)}, <em>slower</em>{" "}than sequential&apos;s{" "}
            {formatSeconds(cpuSeq.wallMs)}. Only parallelism helps:{" "}
            <strong className="text-text">{speedup(cpuSeq.wallMs, cpuPar.wallMs)}</strong>{" "}on {MAX_CORES} cores.
          </p>
          <p>
            So before reaching for either tool, find out where the time goes. A profiler that shows the CPU pegged
            means you need cores. One that shows the CPU mostly idle while requests are slow means you&apos;re
            waiting, and more cores won&apos;t help.
          </p>
        </Section>

        <Section title="Context switches aren't free">
          <p>
            To take turns, a core has to stop one task and start another: save its registers and stack pointer,
            load the next one&apos;s, and often throw away the CPU cache contents the first task had warmed up. No
            task makes progress during a switch.
          </p>
          <p>
            In the simulation a switch costs {SWITCH_MS}ms against a {QUANTUM_MS}ms{" "}time slice, so you can see
            it; on real hardware an OS thread switch costs a few microseconds against slices of a few
            milliseconds, plus the slower cache afterwards. Either way the shape is the same: the CPU-bound
            concurrent run did {cpuConc.switches} switches where the sequential one did {cpuSeq.switches}, and paid
            for every one.
          </p>
          <p>
            That cost is why runtimes work so hard to make switching cheap. Goroutines, Java virtual threads,
            Kotlin coroutines and <Code>async</Code>/<Code>await</Code>{" "}all switch in user space, without asking
            the kernel, which is what lets one process juggle hundreds of thousands of tasks.
          </p>
        </Section>

        <Section title="Amdahl's law: the ceiling on cores">
          <p>
            Even perfectly parallel hardware can only speed up the part of a job that can be split. If a fraction{" "}
            <Code>p</Code>{" "}of the work parallelizes and the rest has to run in order, <Code>N</Code>{" "}cores give
            at most:
          </p>
          <Pre>{"speedup(N) = 1 / ((1 − p) + p / N)"}</Pre>
          <ComparisonTable
            columns={[...AMDAHL_N.map((n) => `${n} cores`), "∞ cores"]}
            rows={AMDAHL_P.map((p) => ({
              label: `${Math.round(p * 100)}% parallel`,
              values: [
                ...AMDAHL_N.map((n) => (
                  <span key={n} className="font-mono">
                    {amdahl(p, n).toFixed(1)}×
                  </span>
                )),
                <span key="inf" className="font-mono font-semibold text-text">
                  {(1 / (1 - p)).toFixed(0)}×
                </span>,
              ],
            }))}
          />
          <p>
            A job that&apos;s 90% parallel tops out at 10× no matter how many cores you buy, and 64 cores only get
            it to {amdahl(0.9, 64).toFixed(1)}×. The serial part (reading the input, merging results, a lock
            everyone queues on) quickly dominates. The simulation shows a small version of this: the tasks have
            uneven lengths, so near the end of every multi-core run some cores sit idle waiting for the longest
            task to finish.
          </p>
        </Section>

        <Section title="Threads, processes and event loops">
          <p>
            Every language offers some mix of three building blocks. They differ in what they share, what they
            cost, and which quadrant they can reach.
          </p>
          <ComparisonTable
            columns={["Threads", "Processes", "Event loop (async)"]}
            rows={[
              {
                label: "Memory",
                values: ["Shared with other threads", "Private; copy to share", "Shared, but one task runs at a time"],
              },
              {
                label: "Creation cost",
                values: ["Moderate (an OS stack each)", "High (a whole address space)", "Tiny (an object on the heap)"],
              },
              {
                label: "Switch cost",
                values: ["Kernel switch, microseconds", "Kernel switch plus memory mappings", "A function return"],
              },
              {
                label: "A crash takes down",
                values: ["The whole process", "Just that process", "The whole process"],
              },
              {
                label: "Parallel on its own?",
                values: ["Yes (except under a GIL)", "Yes", "No: one core, unless you run several loops"],
              },
              {
                label: "Best for",
                values: ["Mixed work sharing data", "CPU-bound work, isolation", "Lots of I/O-bound connections"],
              },
            ]}
          />
          <p>
            <strong className="text-text">The GIL caveat.</strong>{" "}CPython and Ruby&apos;s MRI have a global
            interpreter lock: only one thread runs interpreter code at a time. Threads still give you concurrency
            for I/O, because blocking calls release the lock, but CPU-bound threads won&apos;t run in parallel. In
            the simulation&apos;s terms, Python threads behave like the &ldquo;Concurrent, 1 core&rdquo; cell for
            computation. That&apos;s why Python reaches for <Code>multiprocessing</Code>{" "}for CPU work (and why
            free-threaded builds, which drop the GIL, are such a big change).
          </p>
        </Section>

        <Section title="Shared state: what concurrency costs">
          <p>
            Interleaving is only safe when tasks don&apos;t step on each other. The moment two of them read and write
            the same data, the result can depend on exactly where each one got paused:
          </p>
          <Pre>{RACE_SOURCE}</Pre>
          <p>
            This is a <strong className="text-text">race condition</strong>, and it doesn&apos;t need parallelism:
            a single core preempting one thread between the read and the write is enough. Parallel hardware just
            makes it happen more often. The usual fix is a lock, so the read-and-write happens as one unit:
          </p>
          <Pre>{FIX_SOURCE}</Pre>
          <p>
            Locks bring their own problems. Code that holds one is sequential again, so a hot lock quietly turns a
            parallel program back into the sequential row of the table above. Take two locks in different orders
            in two places and you can <strong className="text-text">deadlock</strong>, each task waiting forever
            for the other. The alternatives avoid sharing in the first place: give each task its own data and send
            messages between them (Go channels, actors, a{" "}
            <TopicLink slug="message-queue">message queue</TopicLink>{" "}between services), or make shared data
            immutable.
          </p>
        </Section>

        <Section title="Choosing in practice">
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Mostly waiting (APIs, web servers, scrapers)">
              <p>
                Concurrency first. Async I/O or lightweight threads let one process keep thousands of requests in
                flight. Add processes or machines once one core is genuinely busy.
              </p>
            </ConceptCard>
            <ConceptCard name="Mostly computing (encoding, ML, analytics)">
              <p>
                Parallelism. One worker per core (processes in Python, threads elsewhere), split into chunks large
                enough that coordination is cheap, and expect Amdahl to cap the gain.
              </p>
            </ConceptCard>
            <ConceptCard name="Both (most real services)">
              <p>
                An async or thread-pool server for the I/O, with heavy computation handed off to a separate pool
                sized to the core count, so a slow computation can&apos;t stall the requests that are only waiting.
              </p>
            </ConceptCard>
            <ConceptCard name="Too small to matter">
              <p>
                Stay sequential. If a script runs in two seconds, the bugs that concurrency invites cost more than
                the second you&apos;d save.
              </p>
            </ConceptCard>
          </div>
        </Section>
      </div>

      <TableOfContents sections={SECTIONS} />
    </div>
  );
}
