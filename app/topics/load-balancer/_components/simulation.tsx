"use client";

import Link from "next/link";

import { EventLog } from "@/components/simulation/event-log";
import { StatsBar } from "@/components/simulation/stats-bar";

import { useLoadBalancerSimulation } from "../_lib/use-simulation";
import { AlgorithmSwitch, BackendControls, TrafficControls } from "./controls";
import { LoadBalancerDiagram } from "./diagram";

export function LoadBalancerSimulation() {
  const { snapshot, setAlgorithm, setWeight, toggleHealthy, setFault, setAutoStream, setDdos, sendOne } =
    useLoadBalancerSimulation();

  const allBackendsDown = snapshot.backends.every((b) => !b.healthy);
  const showRateLimiterCallout = snapshot.ddosActive && allBackendsDown;

  const statItems = [
    { label: "sent", value: snapshot.stats.sent },
    { label: "success", value: snapshot.stats.success, color: "var(--status-up)" },
    { label: "error", value: snapshot.stats.error, color: "var(--status-down)" },
    { label: "timeout", value: snapshot.stats.timeout, color: "var(--status-warn)" },
    { label: "rejected", value: snapshot.stats.rejected, color: "var(--status-down)" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        {showRateLimiterCallout && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-status-down bg-status-down/10 px-4 py-3 text-sm">
            <span className="text-text">
              Every backend is down and the flood keeps coming — a load balancer alone
              can&apos;t stop this, it can only spread it around.
            </span>
            <Link
              href="/topics/rate-limiter"
              className="shrink-0 font-medium text-accent hover:underline"
            >
              Learn about rate limiter here →
            </Link>
          </div>
        )}
        <StatsBar items={statItems} />
        <div className="h-[420px] shrink-0 rounded-2xl border border-border bg-panel shadow-sm">
          <LoadBalancerDiagram
            algorithm={snapshot.algorithm}
            backends={snapshot.backends}
            requests={snapshot.requests}
            now={snapshot.now}
          />
        </div>
        <EventLog className="flex flex-1 flex-col" entries={snapshot.log} />
      </div>

      <div className="flex flex-col gap-6">
        <AlgorithmSwitch algorithm={snapshot.algorithm} onChange={setAlgorithm} />
        <TrafficControls
          autoStream={snapshot.autoStream}
          autoStreamRate={snapshot.autoStreamRate}
          ddosActive={snapshot.ddosActive}
          onSendOne={sendOne}
          onSetAutoStream={setAutoStream}
          onSetDdos={setDdos}
        />
        <BackendControls
          algorithm={snapshot.algorithm}
          backends={snapshot.backends}
          onToggleHealthy={toggleHealthy}
          onSetFault={setFault}
          onSetWeight={setWeight}
        />
      </div>
    </div>
  );
}
