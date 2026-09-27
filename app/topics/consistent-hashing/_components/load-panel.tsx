"use client";

import { Term } from "@/components/study/term";
import { StatusDot } from "@/components/ui/status-dot";

import { nodeLabel } from "../_lib/engine";
import { GLOSSARY } from "../_lib/glossary";
import type { Mode, NodeLoad } from "../_lib/types";
import { nodeColor } from "./diagram";

/** Share relative to the fair 1/N: 1.0 is exactly fair. */
function verdict(ratio: number) {
  if (ratio >= 1.75) return { status: "down" as const, label: "hot spot" };
  if (ratio >= 1.25) return { status: "warn" as const, label: "hot" };
  if (ratio <= 0.5) return { status: "idle" as const, label: "starved" };
  return { status: "up" as const, label: "even" };
}

const BAR_COLOR = {
  down: "bg-status-down",
  warn: "bg-status-warn",
  idle: "bg-text-faint",
  up: "bg-status-up",
};

/**
 * The per-node heat-map: how much of the hash space each node owns (its
 * expected load) next to the keys it actually holds right now. Under modulo
 * every share is exactly 1/N; on a ring it's whatever the v-nodes' arcs add
 * up to.
 */
export function LoadPanel({
  mode,
  loads,
  canKill,
  onKill,
}: {
  mode: Mode;
  loads: NodeLoad[];
  canKill: boolean;
  onKill: (id: number) => void;
}) {
  const fair = 1 / loads.length;
  const maxShare = Math.max(...loads.map((l) => l.share), fair * 2);

  return (
    <div className="rounded-xl border border-border bg-panel p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Load per node</p>
        <p className="text-[11px] text-text-faint">
          bar = share of the hash space · tick = fair share ({(fair * 100).toFixed(1)}%)
        </p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {loads.map((l) => {
          const v = verdict(l.share / fair);
          return (
            <li key={l.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 text-xs">
              <span
                className="flex items-center gap-1.5 font-mono font-semibold"
                style={{ color: nodeColor(l.id) }}
              >
                <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: nodeColor(l.id) }} />
                {nodeLabel(l.id)}
              </span>
              <span className="relative h-3 rounded-full bg-panel-raised">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${BAR_COLOR[v.status]}`}
                  style={{ width: `${(l.share / maxShare) * 100}%` }}
                />
                <span
                  aria-hidden
                  className="absolute -inset-y-0.5 w-px bg-text-muted"
                  style={{ left: `${(fair / maxShare) * 100}%` }}
                />
              </span>
              <span className="flex items-center gap-2 text-text-muted">
                <span className="w-12 text-right font-mono text-text">{(l.share * 100).toFixed(1)}%</span>
                <span className="w-16 text-right font-mono">{l.keys} keys</span>
                <span className="flex w-16 items-center gap-1">
                  <StatusDot status={v.status} />
                  {v.label}
                </span>
                <button
                  type="button"
                  onClick={() => onKill(l.id)}
                  disabled={!canKill}
                  aria-label={`Kill node ${nodeLabel(l.id)}`}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted transition-colors hover:border-status-down hover:text-status-down disabled:pointer-events-none disabled:opacity-40"
                >
                  kill
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {mode === "modulo" && (
        <p className="mt-3 text-[11px] leading-relaxed text-text-faint">
          Modulo is perfectly balanced: every node owns exactly 1/N of the hash space. Its problem isn&apos;t
          balance, it&apos;s what happens when N changes.
        </p>
      )}
      {mode === "ring" && (
        <p className="mt-3 text-[11px] leading-relaxed text-text-faint">
          A node&apos;s share is the total length of the arcs ending at its{" "}
          <Term id="virtual-node" glossary={GLOSSARY}>
            v-nodes
          </Term>
          . With few v-nodes those lengths are luck; with many they average out.
        </p>
      )}
    </div>
  );
}
