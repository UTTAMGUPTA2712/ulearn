"use client";

import Link from "next/link";

import { EventLog } from "@/components/simulation/event-log";
import { StatsBar } from "@/components/simulation/stats-bar";
import { Term } from "@/components/study/term";

import { GLOSSARY } from "../_lib/glossary";
import { useRateLimiterSimulation } from "../_lib/use-simulation";
import { AlgorithmSwitch, AttackControls, ClientList, GlobalLimiterConfig, LimiterConfig, TrafficControls } from "./controls";
import { RateLimiterDiagram } from "./diagram";

export function RateLimiterSimulation() {
  const {
    snapshot,
    setAlgorithm,
    setLimit,
    setWindowMs,
    setRefillRate,
    setAutoStream,
    setAttack,
    setGlobalLimiter,
    setGlobalCapacity,
    setGlobalRefillRate,
    sendOne,
    hammerClient,
  } = useRateLimiterSimulation();

  const statItems = [
    { label: "sent", value: snapshot.stats.sent },
    { label: "allowed", value: snapshot.stats.allowed, color: "var(--status-up)" },
    {
      label: <Term id="limited" glossary={GLOSSARY}>limited (429)</Term>,
      value: snapshot.stats.limited,
      color: "var(--status-down)",
    },
    {
      label: <Term id="throttled" glossary={GLOSSARY}>throttled (429 global)</Term>,
      value: snapshot.stats.throttled,
      color: "var(--status-active)",
    },
    {
      label: <Term id="overloaded" glossary={GLOSSARY}>overloaded (503)</Term>,
      value: snapshot.stats.overloaded,
      color: "var(--status-warn)",
    },
    {
      label: <Term id="blocked" glossary={GLOSSARY}>blocked (never reaches app)</Term>,
      value: snapshot.stats.blocked,
      color: "var(--status-down)",
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-panel-raised px-4 py-2.5 text-xs text-text-muted">
          <span>New here? Hover any underlined word for a quick definition, or</span>
          <Link href="/topics/rate-limiter/study" className="font-medium text-accent hover:underline">
            start with Study →
          </Link>
        </div>
        <StatsBar items={statItems} />
        <div className="h-[450px] shrink-0 rounded-2xl border border-border bg-panel shadow-sm">
          <RateLimiterDiagram
            algorithm={snapshot.algorithm}
            allowed={snapshot.stats.allowed}
            limited={snapshot.stats.limited}
            overloaded={snapshot.stats.overloaded}
            requests={snapshot.requests}
            now={snapshot.now}
            globalLimiterActive={snapshot.globalLimiterActive}
            throttled={snapshot.stats.throttled}
            globalTokens={snapshot.globalTokens}
            globalCapacity={snapshot.globalCapacity}
            blockedPackets={snapshot.blockedPackets}
            slowlorisHeld={snapshot.slowlorisHeld}
            slowlorisCapacity={snapshot.slowlorisCapacity}
            activeAttack={snapshot.activeAttack}
            attackSourceCount={snapshot.attackSourceCount}
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
        <GlobalLimiterConfig
          active={snapshot.globalLimiterActive}
          capacity={snapshot.globalCapacity}
          refillRate={snapshot.globalRefillRate}
          onSetActive={setGlobalLimiter}
          onSetCapacity={setGlobalCapacity}
          onSetRefillRate={setGlobalRefillRate}
        />
        <TrafficControls
          autoStream={snapshot.autoStream}
          autoStreamRate={snapshot.autoStreamRate}
          onSendOne={sendOne}
          onHammerClient={hammerClient}
          onSetAutoStream={setAutoStream}
        />
        <AttackControls activeAttack={snapshot.activeAttack} onSetAttack={setAttack} />
      </div>
    </div>
  );
}
