"use client";

import { useConcurrencySimulation } from "../_lib/use-simulation";
import type { Mode } from "../_lib/types";
import { ConcurrencyDiagram } from "./diagram";

const CAPTIONS: Record<Mode, string> = {
  sequential:
    "One task at a time, in order. Simple — but task 6 has to wait for tasks 1 through 5 to fully finish first, even though most of that time nothing about task 6 needed to wait.",
  concurrent:
    "Still one worker, but it keeps switching between tasks instead of finishing one before starting the next. Nothing is happening at the same instant — it just no longer waits on any single task before making progress on the others. That's concurrency: dealing with a lot of things at once.",
  parallel:
    "Multiple workers, each genuinely running a task at the same instant — not switching, not waiting. That's parallelism: doing a lot of things at once. The batch finishes measurably faster than Sequential or Concurrent, because more than one task is actually being worked on at any given moment.",
};

const WORKER_COUNT = 3;

export function TaskFlowScreen({ mode }: { mode: Mode }) {
  const { snapshot, reducedMotion } = useConcurrencySimulation(mode, WORKER_COUNT);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-4 text-xs text-text-faint">
        <span>
          wall clock <span className="font-mono text-text">{(snapshot.wallClockMs / 1000).toFixed(2)}s</span>
        </span>
        <span>
          done <span className="font-mono text-text">{snapshot.stats.completed}/{snapshot.stats.spawned}</span>
        </span>
      </div>
      <div className="h-[360px] shrink-0 rounded-2xl border border-border bg-panel shadow-sm">
        <ConcurrencyDiagram laneCount={snapshot.laneCount} tasks={snapshot.tasks} reducedMotion={reducedMotion} />
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-text-muted">{CAPTIONS[mode]}</p>
    </div>
  );
}
