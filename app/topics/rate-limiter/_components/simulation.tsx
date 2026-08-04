"use client";

import { EventLog } from "@/components/simulation/event-log";
import { StatsBar } from "@/components/simulation/stats-bar";

import { useRateLimiterSimulation } from "../_lib/use-simulation";
import { AlgorithmSwitch, ClientList, LimiterConfig, TrafficControls } from "./controls";
import { RateLimiterDiagram } from "./diagram";

export function RateLimiterSimulation() {
  const {
    snapshot,
    setAlgorithm,
    setLimit,
    setWindowMs,
    setRefillRate,
    setAutoStream,
    setDdos,
    sendOne,
    hammerClient,
  } = useRateLimiterSimulation();

  const statItems = [
    { label: "sent", value: snapshot.stats.sent },
    { label: "allowed", value: snapshot.stats.allowed, color: "var(--status-up)" },
    { label: "limited (429)", value: snapshot.stats.limited, color: "var(--status-down)" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <StatsBar items={statItems} />
        <div className="h-[420px] shrink-0 rounded-2xl border border-border bg-panel shadow-sm">
          <RateLimiterDiagram
            algorithm={snapshot.algorithm}
            allowed={snapshot.stats.allowed}
            limited={snapshot.stats.limited}
            requests={snapshot.requests}
            now={snapshot.now}
          />
        </div>
        <ClientList algorithm={snapshot.algorithm} limit={snapshot.limit} clients={snapshot.clients} />
        <EventLog className="flex flex-1 flex-col" entries={snapshot.log} />
      </div>

      <div className="flex flex-col gap-6">
        <AlgorithmSwitch algorithm={snapshot.algorithm} onChange={setAlgorithm} />
        <LimiterConfig
          algorithm={snapshot.algorithm}
          limit={snapshot.limit}
          windowMs={snapshot.windowMs}
          refillRate={snapshot.refillRate}
          onSetLimit={setLimit}
          onSetWindowMs={setWindowMs}
          onSetRefillRate={setRefillRate}
        />
        <TrafficControls
          autoStream={snapshot.autoStream}
          autoStreamRate={snapshot.autoStreamRate}
          ddosActive={snapshot.ddosActive}
          onSendOne={sendOne}
          onHammerClient={hammerClient}
          onSetAutoStream={setAutoStream}
          onSetDdos={setDdos}
        />
      </div>
    </div>
  );
}
