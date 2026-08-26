"use client";

import { useState } from "react";

import { EventLog } from "@/components/simulation/event-log";
import { StatsBar } from "@/components/simulation/stats-bar";

import { useConcurrencySimulation } from "../_lib/use-simulation";
import { AdvancedConfig, CoreCountControl, ModeSwitch, TaskBurstControls, TaskGrid, WorkloadToggle } from "./controls";
import { ConcurrencyDiagram } from "./diagram";

export function ConcurrencySimulation() {
  const {
    snapshot,
    reducedMotion,
    setMode,
    setWorkload,
    setCoreCount,
    setGilQuantumMs,
    setSpawnOverheadMs,
    spawnBurst,
    addTask,
    reset,
  } = useConcurrencySimulation();
  const [burstSize, setBurstSize] = useState(6);

  const statItems = [
    { label: "wall clock", value: `${(snapshot.wallClockMs / 1000).toFixed(2)}s` },
    { label: "completed", value: `${snapshot.stats.completed}/${snapshot.stats.spawned}` },
    { label: "GIL wait total", value: `${(snapshot.stats.gilWaitTotalMs / 1000).toFixed(2)}s`, color: "var(--status-warn)" },
    { label: "GIL handoffs", value: snapshot.stats.gilSwitches },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <StatsBar items={statItems} />
        <div className="h-[420px] shrink-0 rounded-2xl border border-border bg-panel shadow-sm">
          <ConcurrencyDiagram
            mode={snapshot.mode}
            coreCount={snapshot.coreCount}
            tasks={snapshot.tasks}
            gil={snapshot.gil}
            coreBusyPct={snapshot.coreBusyPct}
            reducedMotion={reducedMotion}
          />
        </div>
        <TaskGrid tasks={snapshot.tasks} />
        <EventLog className="flex flex-1 flex-col" entries={snapshot.log} />
      </div>

      <div className="flex flex-col gap-6">
        <ModeSwitch mode={snapshot.mode} onChange={setMode} />
        <WorkloadToggle workload={snapshot.workload} onChange={setWorkload} />
        <CoreCountControl mode={snapshot.mode} coreCount={snapshot.coreCount} onChange={setCoreCount} />
        <AdvancedConfig
          gilQuantumMs={snapshot.gilQuantumMs}
          spawnOverheadMs={snapshot.spawnOverheadMs}
          onSetGilQuantumMs={setGilQuantumMs}
          onSetSpawnOverheadMs={setSpawnOverheadMs}
        />
        <TaskBurstControls
          burstSize={burstSize}
          onSetBurstSize={setBurstSize}
          onRunBurst={() => spawnBurst(burstSize)}
          onAddTask={addTask}
          onReset={reset}
        />
      </div>
    </div>
  );
}
