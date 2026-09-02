"use client";

import { StatsBar } from "@/components/simulation/stats-bar";

import { useMechanicsSimulation } from "../_lib/use-mechanics";
import { KafkaControls, RabbitControls, TrafficControls } from "./mechanics-controls";
import { MechanicsDiagram } from "./mechanics-diagram";

export function Mechanics() {
  const {
    snapshot,
    setAutoPublish,
    publishOne,
    addConsumer,
    removeConsumer,
    addGroup,
    removeGroup,
    setGroupPollRate,
    setKafkaCapacity,
  } = useMechanicsSimulation();

  const statItems = [
    { label: "RabbitMQ acked (deleted)", value: snapshot.rabbitAckedTotal, color: "var(--status-up)" },
    { label: "RabbitMQ waiting", value: snapshot.rabbitMessages.filter((m) => m.phase === "queued").length },
    { label: "Kafka log size", value: snapshot.kafkaLog.length },
    { label: "Kafka evicted (retention)", value: snapshot.kafkaExpiredTotal, color: "var(--status-down)" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <StatsBar items={statItems} />
        <div className="h-[420px] shrink-0 rounded-2xl border border-border bg-panel shadow-sm">
          <MechanicsDiagram snapshot={snapshot} />
        </div>
        <TrafficControls
          autoPublish={snapshot.autoPublish}
          publishRate={snapshot.publishRate}
          onPublishOne={publishOne}
          onSetAutoPublish={setAutoPublish}
        />
      </div>

      <div className="flex flex-col gap-4">
        <RabbitControls consumers={snapshot.rabbitConsumers} onAddConsumer={addConsumer} onRemoveConsumer={removeConsumer} />
        <KafkaControls
          capacity={snapshot.kafkaCapacity}
          groups={snapshot.kafkaGroups}
          onSetCapacity={setKafkaCapacity}
          onAddGroup={addGroup}
          onRemoveGroup={removeGroup}
          onSetGroupPollRate={setGroupPollRate}
        />
      </div>
    </div>
  );
}
