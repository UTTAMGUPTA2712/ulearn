"use client";

import Link from "next/link";

import { Button } from "@/components/simulation/button";
import { EventLog } from "@/components/simulation/event-log";
import { StatsBar } from "@/components/simulation/stats-bar";
import { Term } from "@/components/study/term";
import { TopicLink } from "@/components/topic/topic-link";

import { LOAD_THRESHOLD, MAX_M } from "../_lib/engine";
import { GLOSSARY } from "../_lib/glossary";
import { useHashingSimulation } from "../_lib/use-simulation";
import { BreakIt, HashFnSwitch, KeyControls, StrategySwitch, TableControls } from "./controls";
import { HashingDiagram } from "./diagram";

export function HashingSimulation() {
  const sim = useHashingSimulation();
  const { snapshot, reducedMotion } = sim;
  const { stats, lastResize } = snapshot;
  const chaining = snapshot.strategy === "chaining";

  // Controls show what was just clicked, even while the table waits for tokens to land before rebuilding.
  const selectedStrategy = snapshot.pending?.strategy ?? snapshot.strategy;
  const selectedHashFn = snapshot.pending?.hashFn ?? snapshot.hashFn;
  const selectedM = snapshot.pending?.m ?? snapshot.m;

  const overloaded = stats.loadFactor > LOAD_THRESHOLD;
  // At the demo's largest size, "turn on auto-resize" can't help any more — explain what a real system does instead.
  const outgrown = overloaded && snapshot.m >= MAX_M;
  const full = !chaining && stats.keys >= snapshot.m;
  const badHashCrowding =
    snapshot.hashFn !== "fnv1a" && stats.keys >= 6 && stats.crowdedBucket >= Math.max(4, stats.keys * 0.3);
  const movedPct = lastResize && lastResize.total > 0 ? Math.round((lastResize.moved / lastResize.total) * 100) : null;

  const statItems = [
    { label: "keys stored", value: stats.keys },
    { label: "buckets (m)", value: snapshot.m },
    {
      label: <Term id="load-factor" glossary={GLOSSARY}>load factor</Term>,
      value: stats.loadFactor.toFixed(2),
      color: overloaded ? "var(--status-warn)" : undefined,
    },
    {
      label: <Term id="collision" glossary={GLOSSARY}>collisions</Term>,
      value: snapshot.collisions,
      color: snapshot.collisions > 0 ? "var(--status-warn)" : undefined,
    },
    {
      label: chaining ? "longest chain" : <Term id="probe" glossary={GLOSSARY}>longest probe</Term>,
      value: stats.longest,
      color: stats.longest >= 5 ? "var(--status-warn)" : undefined,
    },
    {
      label: chaining ? "avg comparisons / lookup" : "avg probes / lookup",
      value: stats.avgComparisons.toFixed(2),
      color: stats.avgComparisons >= 2.5 ? "var(--status-warn)" : undefined,
    },
    { label: "moved on last resize", value: movedPct === null ? "—" : `${movedPct}%` },
  ];

  return (
    // `minmax(0, 1fr)`, not `1fr`: a plain `1fr` track can't shrink below its content's min width, so one
    // long unwrappable log line would widen this column and push the controls off-screen.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-panel-raised px-4 py-2.5 text-xs text-text-muted">
          <span>New here? Hover any underlined word for a quick definition, or</span>
          <Link href="/topics/hashing/study" className="font-medium text-accent hover:underline">
            start with Study →
          </Link>
        </div>

        {badHashCrowding && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-status-warn bg-status-warn/10 px-4 py-3 text-sm">
            <span className="text-text">
              {stats.crowdedBucket} of {stats.keys} keys hash to the same bucket, so finding one of them means
              scanning a list. A bigger table won&apos;t fix this; a better hash function will.
            </span>
            <Button primary onClick={() => sim.setHashFn("fnv1a")} className="shrink-0">
              Switch back to FNV-1a
            </Button>
          </div>
        )}

        {outgrown && (
          <div className="rounded-xl border border-status-warn bg-status-warn/10 px-4 py-3 text-sm text-text-muted">
            <p className="text-text">
              {full
                ? `All ${snapshot.m} slots are taken, and ${MAX_M} buckets is as big as this demo draws.`
                : `Load factor ${stats.loadFactor.toFixed(2)} at ${MAX_M} buckets, as big as this demo draws.`}{" "}
              So what does a real system do next?
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-text">Keep doubling.</strong> A real table grows to 128, 256, 512… until
                memory runs out. Each resize still rehashes every key, but doubling keeps the average cost per
                insert constant.
              </li>
              <li>
                <strong className="text-text">Evict instead of growing.</strong> If the table is a cache, it can
                stay a fixed size and drop the least-recently-used keys to make room.
              </li>
              <li>
                <strong className="text-text">Spread it across machines.</strong> Once one machine&apos;s memory
                isn&apos;t enough, shard the keys with hash(key) mod N servers. Adding a server then moves keys
                just like a resize does. That&apos;s the problem{" "}
                <TopicLink slug="consistent-hashing">Consistent Hashing</TopicLink> solves.
              </li>
              {snapshot.hashFn !== "fnv1a" && (
                <li>
                  <strong className="text-text">But first, fix the hash.</strong> With{" "}
                  {stats.crowdedBucket} keys in one bucket, more space won&apos;t help. A good hash would spread
                  these same keys out.
                </li>
              )}
            </ul>
          </div>
        )}

        {overloaded && !snapshot.autoResize && !outgrown && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-status-warn bg-status-warn/10 px-4 py-3 text-sm">
            <span className="text-text">
              Load factor {stats.loadFactor.toFixed(2)} with auto-resize off.{" "}
              {chaining
                ? "Chains only get longer from here."
                : full
                  ? "Every slot is taken; the next insert has nowhere to go."
                  : "Clusters are merging and probe sequences only get longer from here."}
            </span>
            <Button primary onClick={() => sim.setAutoResize(true)} className="shrink-0">
              Turn on auto-resize
            </Button>
          </div>
        )}

        <StatsBar items={statItems} />

        <div className="h-[470px] shrink-0 rounded-2xl border border-border bg-panel shadow-sm">
          <HashingDiagram
            now={snapshot.now}
            m={snapshot.m}
            strategy={snapshot.strategy}
            hashFn={snapshot.hashFn}
            buckets={snapshot.buckets}
            flights={snapshot.flights}
            trails={snapshot.trails}
            rehash={snapshot.rehash}
            queue={snapshot.queue}
            lastHash={snapshot.lastHash}
            keyCount={stats.keys}
            reducedMotion={reducedMotion}
          />
        </div>

        {lastResize && movedPct !== null && (
          <div className="rounded-xl border border-border bg-panel-raised px-4 py-3 text-sm text-text-muted">
            Growing from {lastResize.fromM} to {lastResize.toM} buckets rehashed all {lastResize.total} keys, and{" "}
            <span className="font-mono font-semibold text-text">{movedPct}%</span> of them landed in a different
            bucket. That&apos;s fine for an in-memory table. If those buckets were cache servers, {movedPct}% of
            your cache would have gone cold in one step. That&apos;s the problem{" "}
            <TopicLink slug="consistent-hashing">Consistent Hashing</TopicLink> solves.
          </div>
        )}

        <EventLog className="flex flex-1 flex-col" entries={snapshot.log} />
      </div>

      <div className="flex flex-col gap-6">
        <StrategySwitch strategy={selectedStrategy} onChange={sim.setStrategy} />
        <HashFnSwitch hashFn={selectedHashFn} onChange={sim.setHashFn} />
        <TableControls
          m={selectedM}
          autoResize={snapshot.autoResize}
          onSetSize={sim.setSize}
          onSetAutoResize={sim.setAutoResize}
          onResize={sim.resize}
        />
        <KeyControls
          autoInsert={snapshot.autoInsert}
          insertRate={snapshot.insertRate}
          onInsert={sim.insert}
          onBurst={sim.insertBurst}
          onSetAutoInsert={sim.setAutoInsert}
          onLookup={sim.lookup}
          onReset={sim.reset}
        />
        <BreakIt onBadHash={sim.plugBadHash} onOverfill={sim.overfill} />
      </div>
    </div>
  );
}
