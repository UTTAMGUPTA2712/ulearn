"use client";

import Link from "next/link";
import { useMemo } from "react";

import { EventLog } from "@/components/simulation/event-log";
import { StatsBar } from "@/components/simulation/stats-bar";
import { Term } from "@/components/study/term";

import { SWITCH_MS, TASK_COUNT, WORKLOAD_LABEL, formatSeconds, quadrantLabel, simulateRun } from "../_lib/engine";
import { GLOSSARY } from "../_lib/glossary";
import type { RunResult } from "../_lib/types";
import { useConcurrencySimulation } from "../_lib/use-simulation";
import { ModelGrid, Playback, Scenarios, WorkloadSwitch } from "./controls";
import { ConcurrencyDiagram } from "./diagram";
import { RunsTable } from "./runs-table";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const times = (x: number) => `${x.toFixed(2)}×`;

/** What the run that just finished shows, in plain words, with its own numbers. */
function Takeaway({ run, concurrentOneCore }: { run: RunResult; concurrentOneCore: number }) {
  const waits = run.workload !== "cpu";
  const T = (id: string, text: string) => (
    <Term id={id} glossary={GLOSSARY}>
      {text}
    </Term>
  );
  const strong = (text: string) => <span className="font-mono font-semibold text-text">{text}</span>;

  if (run.scheduling === "blocking" && run.cores === 1) {
    return waits ? (
      <>
        This is {T("sequential", "sequential")}. For {strong(pct(run.blocked))} of the run the core was held by a
        task that was only waiting on I/O: the hatched stretches. That&apos;s the time concurrency can win back
        without adding a single core.
      </>
    ) : (
      <>
        This is {T("sequential", "sequential")}, and the core was computing {strong(pct(run.utilization))} of the
        time. There&apos;s no waiting to fill, so interleaving can&apos;t help here. Only more cores can.
      </>
    );
  }

  if (run.scheduling === "concurrent" && run.cores === 1) {
    return waits ? (
      <>
        {strong(times(run.speedup))} faster on the same single core, and nothing ever ran at the same instant. Each
        time a task started waiting, the core switched to one that could compute, so the waits overlapped. That&apos;s{" "}
        {T("concurrency", "concurrency")}: a change in structure, not in hardware.
      </>
    ) : (
      <>
        {strong(times(run.speedup))}: slower than sequential. No task ever waits, so taking turns only reorders the
        same computation, and {run.switches} {T("context-switch", "context switches")} added{" "}
        {strong(`${run.switches * SWITCH_MS}ms`)} of pure overhead. Concurrency doesn&apos;t make CPU-bound work
        faster.
      </>
    );
  }

  if (run.scheduling === "blocking") {
    return waits ? (
      <>
        {strong(times(run.speedup))} from {run.cores} cores of {T("parallelism", "parallelism")}, but{" "}
        {strong(pct(run.blocked))} of all core time went to cores holding tasks that were just waiting. One core
        running concurrently finishes this workload in {strong(formatSeconds(concurrentOneCore))}
        {concurrentOneCore < run.wallMs ? ", faster than all of these cores together" : ""}.
      </>
    ) : (
      <>
        {strong(times(run.speedup))} with {run.cores} cores: {T("parallelism", "parallelism")}, tasks genuinely
        computing at the same instant. Not a clean {run.cores}× because the tasks are uneven: once the queue runs
        dry, cores sit idle while the longest task finishes ({strong(pct(run.utilization))}{" "}
        {T("utilization", "utilization")}).
      </>
    );
  }

  return waits ? (
    <>
      {strong(times(run.speedup))}: concurrency overlaps the waiting, parallelism spreads the computing. But compare
      1 core concurrent at {strong(formatSeconds(concurrentOneCore))}: the extra cores bought less than the
      concurrency did, because no number of cores makes the database answer sooner.
    </>
  ) : (
    <>
      {strong(times(run.speedup))}, about what blocking on {run.cores} cores gets. With nothing to wait on, the
      speedup is all parallelism; the slicing just adds {run.switches} switches.
    </>
  );
}

export function ConcurrencySimulation() {
  const sim = useConcurrencySimulation();
  const { snapshot: s } = sim;

  const concurrentOneCore = useMemo(() => simulateRun(s.workload, "concurrent", 1).wallMs, [s.workload]);

  const coreTime = s.now * s.cores;
  const done = s.tasks.filter((t) => t.state === "done").length;
  const latest = s.phase === "done" ? s.runs[0] : undefined;

  const statItems = [
    {
      label: (
        <Term id="wall-clock" glossary={GLOSSARY}>
          wall clock
        </Term>
      ),
      value: formatSeconds(s.now),
      color: "var(--accent)",
    },
    {
      label: (
        <Term id="speedup" glossary={GLOSSARY}>
          vs sequential
        </Term>
      ),
      value: latest ? times(latest.speedup) : "—",
      color: latest && latest.speedup < 1 ? "var(--status-warn)" : undefined,
    },
    {
      label: (
        <Term id="utilization" glossary={GLOSSARY}>
          cores computing
        </Term>
      ),
      value: coreTime === 0 ? "—" : pct(s.cpuMs / coreTime),
    },
    {
      label: "cores blocked on I/O",
      value: coreTime === 0 ? "—" : pct(s.blockedMs / coreTime),
      color: coreTime > 0 && s.blockedMs / coreTime >= 0.25 ? "var(--status-warn)" : undefined,
    },
    {
      label: (
        <Term id="context-switch" glossary={GLOSSARY}>
          context switches
        </Term>
      ),
      value: s.switches,
    },
    { label: "tasks done", value: `${done}/${TASK_COUNT}` },
  ];

  return (
    // `minmax(0, 1fr)`, not `1fr`: a plain `1fr` track can't shrink below its content's min width, so one
    // long unwrappable log line would widen this column and push the controls off-screen.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-panel-raised px-4 py-2.5 text-xs text-text-muted">
          <span>New here? Hover any underlined word for a quick definition, or</span>
          <Link href="/topics/concurrency-vs-parallelism/study" className="font-medium text-accent hover:underline">
            start with Study →
          </Link>
        </div>

        <StatsBar items={statItems} />

        <div className="rounded-2xl border border-border bg-panel p-2 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 pt-2">
            <p className="text-sm font-medium text-text">
              {quadrantLabel(s.scheduling, s.cores)}
              <span className="font-normal text-text-muted">
                {" "}
                · {WORKLOAD_LABEL[s.workload]} · {s.cores} core{s.cores === 1 ? "" : "s"}
              </span>
            </p>
            {s.phase === "idle" && <p className="text-xs text-text-faint">Press Run to start the clock.</p>}
          </div>
          <ConcurrencyDiagram
            phase={s.phase}
            scheduling={s.scheduling}
            cores={s.cores}
            now={s.now}
            tasks={s.tasks}
            coreStates={s.coreStates}
            coreSpans={s.coreSpans}
            taskSpans={s.taskSpans}
            baselineMs={s.baselineMs}
            axisMs={s.axisMs}
          />
        </div>

        {latest && (
          <div
            className={
              latest.speedup < 1
                ? "rounded-xl border border-status-warn bg-status-warn/10 px-4 py-3 text-sm text-text"
                : "rounded-xl border border-border bg-panel-raised px-4 py-3 text-sm text-text-muted"
            }
          >
            <Takeaway run={latest} concurrentOneCore={concurrentOneCore} />
          </div>
        )}

        <RunsTable runs={s.runs} onClear={sim.clearRuns} />

        <EventLog className="flex flex-1 flex-col" entries={s.log} />
      </div>

      <div className="flex flex-col gap-6">
        <WorkloadSwitch workload={s.workload} onChange={sim.setWorkload} />
        <ModelGrid
          scheduling={s.scheduling}
          cores={s.cores}
          onChange={(scheduling, cores) => {
            sim.setScheduling(scheduling);
            sim.setCores(cores);
          }}
        />
        <Playback
          phase={s.phase}
          speed={s.speed}
          onRun={sim.run}
          onPause={sim.pause}
          onReset={sim.resetRun}
          onSpeed={sim.setSpeed}
        />
        <Scenarios onRun={sim.runScenario} />
      </div>
    </div>
  );
}
