"use client";

import { useLoadBalancerSimulation } from "../_lib/use-simulation";
import { AlgorithmSwitch, BackendControls, TrafficControls } from "./controls";
import { LoadBalancerDiagram } from "./diagram";
import { EventLog } from "./event-log";
import { StatsBar } from "./stats-bar";

export function LoadBalancerSimulation() {
  const { snapshot, setAlgorithm, setWeight, toggleHealthy, setFault, setAutoStream, setDdos, sendOne } =
    useLoadBalancerSimulation();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <StatsBar stats={snapshot.stats} />
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
