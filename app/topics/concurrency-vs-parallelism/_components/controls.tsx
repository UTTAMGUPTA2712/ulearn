"use client";

import { Button } from "@/components/simulation/button";
import { Term } from "@/components/study/term";
import { cn } from "@/lib/utils/cn";

import { MAX_CORES, QUANTUM_MS, SPEEDS, SWITCH_MS, WORKLOAD_LABEL, quadrantLabel } from "../_lib/engine";
import { GLOSSARY } from "../_lib/glossary";
import type { Phase, Scheduling, Workload } from "../_lib/types";

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">{children}</p>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[11px] leading-relaxed text-text-faint">{children}</p>;
}

const WORKLOAD_HINT: Record<Workload, React.ReactNode> = {
  cpu: (
    <>
      <Term id="cpu-bound" glossary={GLOSSARY}>
        Pure computation
      </Term>
      , like resizing images. Nothing ever waits, so a task only finishes sooner if it gets a core to itself.
    </>
  ),
  io: (
    <>
      Web requests: a little CPU, a long wait on a database, a little CPU. Mostly{" "}
      <Term id="io-bound" glossary={GLOSSARY}>
        waiting
      </Term>
      , and the waiting happens off the CPU.
    </>
  ),
  mixed: <>Half of the tasks crunch, half mostly wait. Most real services look like this.</>,
};

export function WorkloadSwitch({ workload, onChange }: { workload: Workload; onChange: (w: Workload) => void }) {
  return (
    <div>
      <Heading>Workload</Heading>
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Workload">
        {(Object.keys(WORKLOAD_LABEL) as Workload[]).map((w) => (
          <Button key={w} active={workload === w} aria-pressed={workload === w} onClick={() => onChange(w)}>
            {WORKLOAD_LABEL[w]}
          </Button>
        ))}
      </div>
      <Hint>{WORKLOAD_HINT[workload]}</Hint>
    </div>
  );
}

/**
 * The 2×2 at the heart of the topic: concurrency (rows) and parallelism
 * (columns) are independent, and each cell is a real configuration you can run.
 */
export function ModelGrid({
  scheduling,
  cores,
  onChange,
}: {
  scheduling: Scheduling;
  cores: number;
  onChange: (scheduling: Scheduling, cores: number) => void;
}) {
  const multi = cores > 1;
  const cell = (s: Scheduling, wantMulti: boolean) => {
    const selected = scheduling === s && multi === wantMulti;
    const target = wantMulti ? (multi ? cores : MAX_CORES) : 1;
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onChange(s, target)}
        className={cn(
          "rounded-lg border px-2 py-2 text-left text-xs font-medium transition-colors",
          selected
            ? "border-accent bg-accent/15 text-accent"
            : "border-border text-text-muted hover:border-border-strong hover:text-text",
        )}
      >
        {quadrantLabel(s, wantMulti ? 2 : 1)}
      </button>
    );
  };

  return (
    <div>
      <Heading>Execution model</Heading>
      <div className="mt-2 grid grid-cols-[auto_1fr_1fr] items-center gap-1.5">
        <span />
        <span className="text-center text-[11px] text-text-faint">1 core</span>
        <span className="text-center text-[11px] text-text-faint">2+ cores</span>
        <span className="pr-1 text-[11px] text-text-faint">Blocking</span>
        {cell("blocking", false)}
        {cell("blocking", true)}
        <span className="pr-1 text-[11px] text-text-faint">Concurrent</span>
        {cell("concurrent", false)}
        {cell("concurrent", true)}
      </div>
      <Hint>
        {scheduling === "blocking" ? (
          <>
            A core keeps its task until it finishes, even while the task is{" "}
            <Term id="blocking" glossary={GLOSSARY}>
              blocked
            </Term>{" "}
            on I/O.
          </>
        ) : (
          <>
            A core drops a task the moment it starts waiting, and{" "}
            <Term id="preemption" glossary={GLOSSARY}>
              preempts
            </Term>{" "}
            it after a {QUANTUM_MS}ms{" "}
            <Term id="time-slice" glossary={GLOSSARY}>
              slice
            </Term>
            . Each{" "}
            <Term id="context-switch" glossary={GLOSSARY}>
              switch
            </Term>{" "}
            costs {SWITCH_MS}ms (exaggerated so you can see it).
          </>
        )}
      </Hint>

      <div className="mt-3 flex items-center gap-1.5" role="group" aria-label="Cores">
        <span className="w-12 text-sm text-text-muted">Cores</span>
        {Array.from({ length: MAX_CORES }, (_, i) => i + 1).map((n) => (
          <Button
            key={n}
            active={cores === n}
            aria-pressed={cores === n}
            aria-label={`${n} core${n === 1 ? "" : "s"}`}
            onClick={() => onChange(scheduling, n)}
            className="w-9 px-0 font-mono"
          >
            {n}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function Playback({
  phase,
  speed,
  onRun,
  onPause,
  onReset,
  onSpeed,
}: {
  phase: Phase;
  speed: number;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeed: (s: number) => void;
}) {
  return (
    <div>
      <Heading>Run</Heading>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {phase === "running" ? (
          <Button onClick={onPause}>Pause</Button>
        ) : (
          <Button primary onClick={onRun}>
            {phase === "paused" ? "Resume" : phase === "done" ? "Run again" : "Run"}
          </Button>
        )}
        <Button onClick={onReset} disabled={phase === "idle"}>
          Clear timeline
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-1.5" role="group" aria-label="Playback speed">
        <span className="w-12 text-sm text-text-muted">Speed</span>
        {SPEEDS.map((s) => (
          <Button key={s} active={speed === s} aria-pressed={speed === s} onClick={() => onSpeed(s)} className="font-mono">
            {s}×
          </Button>
        ))}
      </div>
      <Hint>Changing the workload or model clears the timeline. Finished runs stay in the table below.</Hint>
    </div>
  );
}

const SCENARIOS: { workload: Workload; scheduling: Scheduling; cores: number; title: string; hint: string }[] = [
  {
    workload: "io",
    scheduling: "blocking",
    cores: 1,
    title: "Web requests, one at a time",
    hint: "The core spends most of the run holding a request that's just waiting on the database.",
  },
  {
    workload: "io",
    scheduling: "concurrent",
    cores: 1,
    title: "Same requests, concurrent",
    hint: "Still one core, nothing runs at the same instant, and it's over 3× faster.",
  },
  {
    workload: "cpu",
    scheduling: "concurrent",
    cores: 1,
    title: "Number crunching, concurrent",
    hint: "Interleaving pure computation just reorders it, and every switch adds time.",
  },
  {
    workload: "cpu",
    scheduling: "blocking",
    cores: 4,
    title: "Number crunching on 4 cores",
    hint: "Parallelism: the only thing that makes CPU-bound work finish sooner.",
  },
];

export function Scenarios({ onRun }: { onRun: (w: Workload, s: Scheduling, cores: number) => void }) {
  return (
    <div>
      <Heading>Try it</Heading>
      <div className="mt-2 grid gap-2">
        {SCENARIOS.map((s) => (
          <div key={s.title} className="rounded-xl border border-border bg-panel p-3">
            <Button onClick={() => onRun(s.workload, s.scheduling, s.cores)}>{s.title}</Button>
            <Hint>{s.hint}</Hint>
          </div>
        ))}
      </div>
    </div>
  );
}
