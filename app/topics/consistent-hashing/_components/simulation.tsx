"use client";

import Link from "next/link";

import { Button } from "@/components/simulation/button";
import { EventLog } from "@/components/simulation/event-log";
import { StatsBar } from "@/components/simulation/stats-bar";
import { Term } from "@/components/study/term";

import { MIN_NODES, STAMPEDE_THRESHOLD, nodeLabel } from "../_lib/engine";
import { GLOSSARY } from "../_lib/glossary";
import { useConsistentHashingSimulation } from "../_lib/use-simulation";
import { ClusterControls, KeyControls, ModeSwitch, Scenarios } from "./controls";
import { ConsistentHashingDiagram } from "./diagram";
import { LoadPanel } from "./load-panel";

const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

export function ConsistentHashingSimulation() {
  const sim = useConsistentHashingSimulation();
  const { snapshot, reducedMotion } = sim;
  const { lastChange: change, mode } = snapshot;
  const ring = mode === "ring";

  const movedPct = change && change.total > 0 ? pct(change.moved, change.total) : null;
  const stampede = snapshot.now < snapshot.stampedeUntil;
  const imbalancePct = snapshot.imbalance * 100;

  const statItems = [
    { label: "active nodes", value: snapshot.nodes.length },
    { label: "total keys", value: snapshot.keys.length },
    {
      label: (
        <Term id="remapping" glossary={GLOSSARY}>
          keys remapped on last change
        </Term>
      ),
      value: movedPct === null ? "—" : `${movedPct}%`,
      color:
        movedPct === null
          ? undefined
          : movedPct / 100 > STAMPEDE_THRESHOLD
            ? "var(--status-down)"
            : movedPct > 0
              ? "var(--status-warn)"
              : "var(--status-up)",
    },
    {
      label: (
        <Term id="load-imbalance" glossary={GLOSSARY}>
          load imbalance std-dev
        </Term>
      ),
      value: `${imbalancePct.toFixed(1)}%`,
      color: imbalancePct >= 40 ? "var(--status-down)" : imbalancePct >= 15 ? "var(--status-warn)" : undefined,
    },
  ];

  const needless = change ? change.moved - change.forced : 0;
  const ideal = change ? Math.round(change.total / Math.max(change.fromN, change.toN)) : 0;

  return (
    // `minmax(0, 1fr)`, not `1fr`: a plain `1fr` track can't shrink below its content's min width, so one
    // long unwrappable log line would widen this column and push the controls off-screen.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-panel-raised px-4 py-2.5 text-xs text-text-muted">
          <span>New here? Hover any underlined word for a quick definition, or</span>
          <Link href="/topics/consistent-hashing/study" className="font-medium text-accent hover:underline">
            start with Study →
          </Link>
        </div>

        <StatsBar items={statItems} />

        <div className="h-[470px] shrink-0 rounded-2xl border border-border bg-panel shadow-sm">
          <ConsistentHashingDiagram
            now={snapshot.now}
            mode={mode}
            nodes={snapshot.nodes}
            vnodes={snapshot.vnodes}
            keys={snapshot.keys}
            ring={snapshot.ring}
            transition={snapshot.transition}
            stampede={stampede}
            lastMoved={change}
            reducedMotion={reducedMotion}
          />
        </div>

        {change &&
          change.total > 0 &&
          change.mode === "modulo" &&
          change.moved / change.total > STAMPEDE_THRESHOLD && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-down bg-status-down/10 px-4 py-3 text-sm">
              <p className="text-text">
                <span className="font-mono font-semibold">{movedPct}%</span> of the cache just went cold.{" "}
                {change.kind === "kill" && (
                  <>
                    Only {change.forced} keys actually lived on {nodeLabel(change.dead!)}; the other {needless}{" "}
                    moved off healthy nodes because <span className="font-mono">hash % {change.fromN}</span> and{" "}
                    <span className="font-mono">hash % {change.toN}</span> disagree for almost every key.{" "}
                  </>
                )}
                Every one of them is a miss that falls through to the database at the same moment: a{" "}
                <Term id="cache-stampede" glossary={GLOSSARY}>
                  cache stampede
                </Term>
                .
                {change.otherMoved !== null && (
                  <>
                    {" "}
                    A hash ring would have moved{" "}
                    <span className="font-mono font-semibold">{pct(change.otherMoved, change.total)}%</span>.
                  </>
                )}
              </p>
              <Button primary onClick={() => sim.runKillScenario("ring")} className="shrink-0">
                Replay it on the ring
              </Button>
            </div>
          )}

        {change && change.total > 0 && change.mode === "ring" && change.kind !== "vnodes" && (
          <div className="rounded-xl border border-border bg-panel-raised px-4 py-3 text-sm text-text-muted">
            The ring remapped <span className="font-mono font-semibold text-text">{movedPct}%</span> of keys (
            {change.moved} of {change.total}), and all of them were keys that{" "}
            {change.kind === "kill" ? `lived on ${nodeLabel(change.dead!)}` : "the new node took over"}. The{" "}
            <Term id="minimal-disruption" glossary={GLOSSARY}>
              ideal
            </Term>{" "}
            is one node&apos;s worth, about {ideal} keys.
            {change.otherMoved !== null && (
              <>
                {" "}
                <span className="font-mono">hash % N</span> would have moved{" "}
                <span className="font-mono font-semibold text-status-down">{change.otherMoved}</span>.
              </>
            )}
            {Math.abs(change.moved - ideal) > ideal * 0.4 && snapshot.vnodes < 50 && (
              <> The gap from the ideal is v-node luck: with {snapshot.vnodes} per node, arc sizes vary a lot.</>
            )}
          </div>
        )}

        {change && change.total > 0 && change.mode === "ring" && change.kind === "vnodes" && (
          <div className="rounded-xl border border-border bg-panel-raised px-4 py-3 text-sm text-text-muted">
            Changing the v-node count moved {change.moved} keys ({movedPct}%) without any server coming or going:
            new positions take slices of their neighbours&apos; arcs, and removed ones hand theirs on. Real systems
            pick the count once, not on the fly.
          </div>
        )}

        <LoadPanel
          mode={mode}
          loads={snapshot.loads}
          canKill={snapshot.nodes.length > MIN_NODES}
          onKill={sim.killNode}
        />

        {ring && snapshot.vnodes <= 3 && (
          <div className="rounded-xl border border-status-warn bg-status-warn/10 px-4 py-3 text-sm text-text">
            With {snapshot.vnodes} v-node{snapshot.vnodes === 1 ? "" : "s"} per node, each node&apos;s share is
            whatever gap its positions happened to land after: std-dev {imbalancePct.toFixed(0)}% of a fair share.
            Drag v-nodes past 100 and watch the bars even out.
          </div>
        )}

        <EventLog className="flex flex-1 flex-col" entries={snapshot.log} />
      </div>

      <div className="flex flex-col gap-6">
        <ModeSwitch mode={mode} onChange={sim.setMode} />
        <ClusterControls
          mode={mode}
          nodeCount={snapshot.nodes.length}
          vnodes={snapshot.vnodes}
          onSetNodeCount={sim.setNodeCount}
          onSetVnodes={sim.setVnodes}
          onAddNode={sim.addNode}
          onKillRandom={sim.killRandomNode}
        />
        <KeyControls keyCount={snapshot.keys.length} onInject={sim.injectKeys} onReset={sim.reset} />
        <Scenarios onRun={sim.runKillScenario} />
      </div>
    </div>
  );
}
