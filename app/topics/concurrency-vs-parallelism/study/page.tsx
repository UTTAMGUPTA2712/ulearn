import type { Metadata } from "next";

import { ComparisonTable } from "@/components/study/comparison-table";
import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";
import { TableOfContents } from "@/components/study/table-of-contents";
import { topicMetadata } from "@/lib/seo";

export const metadata: Metadata = topicMetadata("concurrency-vs-parallelism", "study");

const SECTIONS = ["Concurrency vs parallelism", "Multithreading", "Multiprocessing", "Threads vs processes", "The bottom line"];

export default function ConcurrencyStudyPage() {
  return (
    <div className="mx-auto flex max-w-[67rem] gap-12">
      <div className="min-w-0 max-w-3xl flex-1 space-y-8">
        <Section title="Concurrency vs parallelism">
          <p>
            There&apos;s a well-known line from Rob Pike that sums this whole topic up: &ldquo;Concurrency is about
            dealing with a lot of things at once. Parallelism is about doing a lot of things at once.&rdquo;
            It&apos;s a clean sentence, but it takes a beat to actually land — so here it is in plainer terms, with
            the two levels these four words sit on kept separate:
          </p>
          <p>
            <strong>Concurrency and parallelism are about what a program achieves</strong> — the goal or the result.{" "}
            <strong>Multithreading and multiprocessing are about how you build it</strong> — the tool you reach for
            to get there. Mixing those two levels up is where most of the confusion comes from.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Concurrency">
              Dealing with multiple tasks at the same time — without necessarily doing heavy work on all of them
              every single second. The program switches quickly between tasks, or waits on the slow ones (a network
              call, a file save) while making progress on something else. In simple words: concurrency is like
              juggling — you keep several balls in the air by tossing them one after another, fast enough that none
              of them drop. A music app playing a song while it downloads the next track and updates your
              recommendations, or a web server handling hundreds of browsing sessions without making anyone wait
              forever, are both concurrency — mostly waiting, not mostly computing, which is why even a single core
              can juggle thousands of these.
            </ConceptCard>
            <ConceptCard name="Parallelism">
              Actually running multiple heavy tasks at the exact same moment — not switching, not waiting, genuinely
              simultaneous. That only happens with more than one CPU core, each doing its own independent work at
              the same instant. In simple words: parallelism is like several people each working on a different
              part of one big job at once — everyone busy right now, nobody taking turns. Editing 50 photos with
              each core handling a different photo, training a model with the math split across cores, or
              transcoding a long video faster because the cores share the load, are all parallelism.
            </ConceptCard>
          </div>
          <p>
            The three screens on the Simulate tab make the gap concrete, all running the exact same batch of
            differently-sized tasks. Sequential and Concurrent both run on a single worker, so neither is ever truly
            parallel — but Concurrent&apos;s one lane interleaves between tasks instead of finishing one before
            starting the next. Total time barely changes; what changes is that no single task blocks all the others.
            Parallel spreads that same batch across three workers, and the wall clock actually drops — that&apos;s
            the difference in one page.
          </p>
        </Section>

        <Section title="Multithreading">
          <p>
            Multithreading is one common way to build concurrency (and sometimes parallelism, depending on the
            language). You create several threads inside the same program — small workers that share almost
            everything: the same memory, the same variables, the same open files.
          </p>
          <p>
            In simple words: multithreading is many small helpers working inside one big room, sharing the same
            tools and notes. Sharing makes it cheap for them to pass information to each other. It also means that
            if two threads reach for the same tool at the same time, they can collide — a &ldquo;race
            condition&rdquo; — which is why touching shared state from more than one thread needs careful rules
            (locks) around it.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="On one core">
              You get concurrency — the helpers take turns, but only one is ever actually running at a given
              instant. That&apos;s exactly what the simulator&apos;s Concurrent mode shows.
            </ConceptCard>
            <ConceptCard name="On many cores">
              You can get parallelism too — different helpers running on different cores at the same time. Some
              languages add extra rules here: CPython&apos;s Global Interpreter Lock, for instance, stops Python
              threads from running Python code in true parallel even on a multi-core machine. That&apos;s a
              language-specific quirk, not a rule of multithreading in general — Java and Go threads have no such
              lock.
            </ConceptCard>
          </div>
          <p>
            Best for: tasks that spend a lot of time waiting — network requests, user input, reading files — where
            the win isn&apos;t more CPU, it&apos;s not sitting idle during the wait.
          </p>
        </Section>

        <Section title="Multiprocessing">
          <p>
            Multiprocessing is the other way to get concurrency, and especially parallelism. Instead of threads
            inside one program, you start several completely separate programs — processes — each with its own
            private memory. Nothing is shared automatically; to communicate, they pass messages back and forth,
            which is slower than sharing memory but far safer, since neither side can accidentally overwrite the
            other&apos;s work.
          </p>
          <p>
            In simple words: multiprocessing is several full, independent teams working in their own rooms — they
            can shout questions to each other through the wall, but they don&apos;t touch each other&apos;s stuff.
            Because each process is fully separate, they can run truly in parallel across different cores even in
            languages where threads have limitations.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="What it costs">
              Every process pays a real startup cost — a fresh memory space and, in a language like Python, a whole
              new interpreter — before it runs a single line of code. That overhead is the tradeoff for isolation.
            </ConceptCard>
            <ConceptCard name="What it buys">
              Because nothing is shared, there&apos;s nothing for two processes to corrupt by touching at once —
              safe by default, where multithreading needs explicit locking around anything shared.
            </ConceptCard>
          </div>
          <p>
            Best for: heavy number-crunching that doesn&apos;t spend much time waiting — image processing, data
            analysis, scientific simulations — where the goal is genuinely more computation per second, not more
            responsiveness.
          </p>
        </Section>

        <Section title="Threads vs processes">
          <p>
            The Multithreading and Multiprocessing screens on the Simulate tab put these two side by side visually —
            one shared room versus several separate ones. The table below is the same comparison as a quick
            reference.
          </p>
          <ComparisonTable
            columns={["Threads", "Processes"]}
            rows={[
              { label: "Memory", values: ["Shared — one address space", "Isolated — its own address space each"] },
              { label: "Communication", values: ["Direct — just share a variable", "Explicit — messages / IPC"] },
              {
                label: "Safety",
                values: ["A data race away from corrupting shared state without locks", "Safe by default — nothing shared to corrupt"],
              },
              { label: "Startup cost", values: ["Cheap — microseconds", "Expensive — a real OS process spawn"] },
              { label: "Best for", values: ["I/O-bound work — lots of waiting", "CPU-bound work — lots of computing"] },
            ]}
          />
        </Section>

        <Section title="The bottom line">
          <p>Put together, the decision is short:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Use <strong>concurrency</strong> when your app needs to stay responsive while handling lots of
              requests or waits — reach for multithreading or an async/event-loop tool.
            </li>
            <li>
              Use <strong>parallelism</strong> when you have big calculations that genuinely need to finish faster —
              reach for multiprocessing for reliability, or multithreading if your language can truly parallelize
              threads.
            </li>
            <li>Most real apps mix both: concurrency to keep users comfortable, parallelism for the heavy lifting behind the scenes.</li>
          </ul>
        </Section>
      </div>

      <TableOfContents sections={SECTIONS} />
    </div>
  );
}
