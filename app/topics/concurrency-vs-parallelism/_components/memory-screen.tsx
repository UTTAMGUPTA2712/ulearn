"use client";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

type MemoryKind = "threads" | "processes";

const CAPTIONS: Record<MemoryKind, string> = {
  threads:
    "Threads are small helpers working inside one big room, sharing the same tools and notes. That makes passing information between them fast — but if two threads grab the same tool at once, they can collide (a \"race condition\"), so touching shared data needs careful rules. Best for tasks that spend a lot of time waiting — network requests, user input, reading files.",
  processes:
    "Processes are separate teams, each in their own room with their own tools. They can't accidentally touch each other's stuff, but sharing anything means shouting a message through the wall — slower than threads, and much safer. Best for heavy number-crunching that doesn't spend much time waiting — image processing, data analysis, scientific simulations.",
};

function WorkerChip({ x, y, pulse, delayMs = 0 }: { x: number; y: number; pulse: boolean; delayMs?: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} className={pulse ? "animate-pulse" : ""} style={pulse ? { animationDelay: `${delayMs}ms` } : undefined}>
      <circle r={10} fill="var(--panel-raised)" stroke="var(--accent)" strokeWidth={1.5} />
      <circle r={3} fill="var(--accent)" />
    </g>
  );
}

function ThreadsDiagram({ reducedMotion }: { reducedMotion: boolean }) {
  const workerXs = [230, 290, 350, 410];
  return (
    <svg viewBox="0 0 640 190" className="h-full w-full" role="img" aria-label="Multiple threads sharing one process's memory">
      <rect x={20} y={16} width={600} height={150} rx={14} fill="var(--panel-raised)" stroke="var(--border)" />
      <text x={36} y={38} fontSize={10} className="fill-text-faint font-mono uppercase">
        one process
      </text>

      {workerXs.map((x, i) => (
        <g key={i}>
          <line x1={x} y1={64} x2={320} y2={116} stroke="var(--border-strong)" strokeWidth={1.2} />
          <WorkerChip x={x} y={64} pulse={!reducedMotion} delayMs={i * 220} />
          <text x={x} y={82} textAnchor="middle" fontSize={9} className="fill-text-muted font-mono">
            t{i}
          </text>
        </g>
      ))}

      <rect
        x={260}
        y={116}
        width={120}
        height={34}
        rx={8}
        fill="var(--panel)"
        stroke="var(--accent)"
        strokeWidth={1.5}
        className={reducedMotion ? "" : "animate-pulse"}
      />
      <text x={320} y={137} textAnchor="middle" fontSize={10} className="fill-text font-medium">
        shared memory
      </text>
    </svg>
  );
}

function ProcessesDiagram({ reducedMotion }: { reducedMotion: boolean }) {
  const boxXs = [30, 250, 470];
  const labels = ["process A", "process B", "process C"];
  return (
    <svg viewBox="0 0 640 190" className="h-full w-full" role="img" aria-label="Separate processes with their own memory, passing messages">
      {boxXs.map((x, i) => (
        <g key={i}>
          <rect x={x} y={16} width={140} height={150} rx={14} fill="var(--panel-raised)" stroke="var(--border)" />
          <text x={x + 70} y={38} textAnchor="middle" fontSize={10} className="fill-text-faint font-mono uppercase">
            {labels[i]}
          </text>
          <WorkerChip x={x + 70} y={68} pulse={false} />
          <rect x={x + 30} y={100} width={80} height={34} rx={8} fill="var(--panel)" stroke="var(--accent)" strokeWidth={1.5} />
          <text x={x + 70} y={121} textAnchor="middle" fontSize={9} className="fill-text font-medium">
            own memory
          </text>
        </g>
      ))}

      {[170, 390].map((x, i) => (
        <g key={i} className={reducedMotion ? "" : "animate-pulse"} style={reducedMotion ? undefined : { animationDelay: `${i * 300}ms` }}>
          <line x1={x} y1={91} x2={x + 80} y2={91} stroke="var(--text-faint)" strokeWidth={1.2} strokeDasharray="4 3" />
          <text x={x + 40} y={83} textAnchor="middle" fontSize={8.5} className="fill-text-faint">
            message
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * A looping illustration, not a toggle — the earlier version of this screen
 * put Multithreading and Multiprocessing behind a click-to-switch control;
 * now they're two separate screens (see `simulation.tsx`) and each one just
 * plays. Multithreading vs multiprocessing is a memory-model distinction,
 * not a scheduling one, so there's no tick engine here — a couple of
 * staggered `animate-pulse` loops are enough to make "constantly touching
 * shared memory" vs "occasionally passing a message" read at a glance.
 */
export function MemoryScreen({ kind }: { kind: MemoryKind }) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[220px] shrink-0 rounded-2xl border border-border bg-panel p-3 shadow-sm">
        {kind === "threads" ? <ThreadsDiagram reducedMotion={reducedMotion} /> : <ProcessesDiagram reducedMotion={reducedMotion} />}
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-text-muted">{CAPTIONS[kind]}</p>
    </div>
  );
}
