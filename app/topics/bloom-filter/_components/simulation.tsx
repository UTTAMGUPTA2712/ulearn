"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/simulation/button";
import { EventLog } from "@/components/simulation/event-log";
import { StatsBar } from "@/components/simulation/stats-bar";
import { Term } from "@/components/study/term";

import { DISK_READ_MS, oneIn } from "../_lib/engine";
import { GLOSSARY } from "../_lib/glossary";
import { useBloomSimulation } from "../_lib/use-simulation";
import { DeleteControls, KeyControls, ShapeControls, StressControls } from "./controls";
import { BloomDiagram } from "./diagram";

function percent(x: number) {
  if (x === 0) return "0%";
  if (x < 0.0001) return "<0.01%";
  return `${(x * 100).toFixed(x < 0.1 ? 2 : 1)}%`;
}

export function BloomSimulation() {
  const sim = useBloomSimulation();
  const { snapshot } = sim;
  const { stats, lastBatch, deletion, falsePositive } = snapshot;
  const [keyInput, setKeyInput] = useState("");

  const statItems = [
    {
      label: <Term id="saturation" glossary={GLOSSARY}>bit saturation</Term>,
      value: `${Math.round(stats.saturation * 100)}%`,
      color: stats.saturation >= 0.7 ? "var(--status-warn)" : undefined,
    },
    { label: "items inserted (n)", value: stats.n },
    {
      label: <Term id="fp-rate" glossary={GLOSSARY}>theoretical FP rate</Term>,
      value: percent(stats.theoreticalFp),
      color: stats.theoreticalFp >= 0.1 ? "var(--status-warn)" : undefined,
    },
    {
      label: <Term id="disk-seek" glossary={GLOSSARY}>disk seeks prevented</Term>,
      value: stats.seeksPrevented,
      color: stats.seeksPrevented > 0 ? "var(--status-up)" : undefined,
    },
    {
      label: "false positives",
      value: stats.absentChecked > 0 ? `${stats.falsePositives} / ${stats.absentChecked}` : "0",
      color: stats.falsePositives > 0 ? "var(--status-down)" : undefined,
    },
    { label: "disk time wasted", value: `${stats.diskMsWasted} ms` },
  ];

  return (
    // `minmax(0, 1fr)`, not `1fr`: a plain `1fr` track can't shrink below its content's min width, so one
    // long unwrappable log line would widen this column and push the controls off-screen.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-panel-raised px-4 py-2.5 text-xs text-text-muted">
          <span>New here? Hover any underlined word for a quick definition, or</span>
          <Link href="/topics/bloom-filter/study" className="font-medium text-accent hover:underline">
            start with Study →
          </Link>
        </div>

        {falsePositive && (
          <div role="status" className="rounded-xl border border-status-down bg-status-down/10 px-4 py-3 text-sm">
            <p className="font-semibold tracking-wide text-status-down">FALSE POSITIVE</p>
            <p className="mt-1 text-text">
              <span className="font-mono">{falsePositive.key}</span> was never inserted, but bits{" "}
              <span className="font-mono">{falsePositive.probes.map((p) => p.index).join(", ")}</span> were all
              already 1, set by other keys. The filter said &ldquo;maybe&rdquo;, so the database paid a{" "}
              {DISK_READ_MS} ms disk seek to find nothing.
            </p>
            <p className="mt-1 text-text-muted">
              At this saturation the math predicted it: {oneIn(falsePositive.expectedRate)} absent keys gets through.
              A bigger m or a better-tuned k pushes that back down.
            </p>
          </div>
        )}

        {deletion && deletion.corrupted.length > 0 && (
          <div role="status" className="rounded-xl border border-status-down bg-status-down/10 px-4 py-3 text-sm">
            <p className="text-text">
              Deleting <span className="font-mono">{deletion.key}</span> cleared {deletion.cleared.length} bit
              {deletion.cleared.length === 1 ? "" : "s"}, and {deletion.shared} of them also belonged to other keys.
              Now {deletion.corrupted.length} stored key{deletion.corrupted.length === 1 ? "" : "s"} test
              &ldquo;definitely absent&rdquo;, a <Term id="false-negative" glossary={GLOSSARY}>false negative</Term>
              {" "}— the one answer a Bloom filter promises never to give. Check one:
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {deletion.corrupted.slice(0, 6).map((key) => (
                <Button
                  key={key}
                  onClick={() => {
                    setKeyInput(key);
                    sim.check(key);
                  }}
                  disabled={snapshot.busy}
                  className="font-mono text-xs"
                >
                  {key}
                </Button>
              ))}
              {deletion.corrupted.length > 6 && (
                <span className="text-xs text-text-faint">+{deletion.corrupted.length - 6} more</span>
              )}
            </div>
            <p className="mt-2 text-text-muted">
              The filter has no idea which key set which bit. A{" "}
              <Term id="counting-bloom-filter" glossary={GLOSSARY}>counting Bloom filter</Term> keeps a counter per
              slot instead, so a delete only zeroes a slot nothing else is using.
            </p>
          </div>
        )}

        {deletion && deletion.corrupted.length === 0 && (
          <div role="status" className="rounded-xl border border-status-warn bg-status-warn/10 px-4 py-3 text-sm text-text">
            Deleting <span className="font-mono">{deletion.key}</span> cleared {deletion.cleared.length} bit
            {deletion.cleared.length === 1 ? "" : "s"} and, this time, no other stored key needed them. The filter
            couldn&apos;t have known that in advance. Saturate it and try again.
          </div>
        )}

        <StatsBar items={statItems} />

        <div className="aspect-[720/566] w-full shrink-0 rounded-2xl border border-border bg-panel shadow-sm">
          <BloomDiagram
            now={snapshot.now}
            m={snapshot.m}
            bits={snapshot.bits}
            setBits={stats.setBits}
            op={snapshot.op}
            seek={snapshot.seek}
            batch={snapshot.batch}
            deletion={deletion}
            lastLatencyMs={snapshot.lastLatencyMs}
          />
        </div>

        {lastBatch?.kind === "query" && (
          <div className="rounded-xl border border-border bg-panel-raised px-4 py-3 text-sm text-text-muted">
            Of {lastBatch.count} keys that don&apos;t exist,{" "}
            <span className="font-mono font-semibold text-status-up">{lastBatch.rejected}</span> were rejected from
            RAM without touching the disk, and{" "}
            <span className="font-mono font-semibold text-status-down">{lastBatch.falsePositives}</span> slipped
            through as false positives, costing{" "}
            <span className="font-mono text-text">{lastBatch.falsePositives * DISK_READ_MS} ms</span> of disk time.
            Without a filter, all {lastBatch.count} would have needed a seek:{" "}
            <span className="font-mono text-text">{(lastBatch.count * DISK_READ_MS).toLocaleString("en-US")} ms</span>.
            {lastBatch.saturation < 0.5 && lastBatch.falsePositives === 0 && (
              <> Now saturate the filter and run this again.</>
            )}
          </div>
        )}

        {lastBatch?.kind === "saturate" && (
          <div className="rounded-xl border border-status-warn bg-status-warn/10 px-4 py-3 text-sm text-text">
            {lastBatch.n} keys in {lastBatch.m} bits: {Math.round(lastBatch.saturation * 100)}% of the array is now
            1, and the theoretical false positive rate is{" "}
            <span className="font-mono font-semibold">{percent(stats.theoreticalFp)}</span>. An absent key only has
            to land k times on a 1 to get through. Query 100 absent keys and count how many do.
          </div>
        )}

        <EventLog className="flex flex-1 flex-col" entries={snapshot.log} />
      </div>

      <div className="flex flex-col gap-6">
        <KeyControls
          keyInput={keyInput}
          recentKeys={snapshot.recentKeys}
          busy={snapshot.busy}
          onKeyInput={setKeyInput}
          onInsert={() => sim.insert(keyInput)}
          onCheck={() => sim.check(keyInput)}
          onReset={() => {
            setKeyInput("");
            sim.reset();
          }}
        />
        <ShapeControls
          m={snapshot.m}
          k={snapshot.k}
          n={stats.n}
          busy={snapshot.busy}
          onSetM={sim.setM}
          onSetK={sim.setK}
        />
        <StressControls busy={snapshot.busy} onQuery={sim.queryAbsent} onSaturate={sim.saturate} />
        <DeleteControls
          keyInput={keyInput}
          busy={snapshot.busy}
          canRestore={deletion !== null}
          onDelete={() => sim.deleteKey(keyInput)}
          onRestore={sim.restoreDeleted}
        />
      </div>
    </div>
  );
}
