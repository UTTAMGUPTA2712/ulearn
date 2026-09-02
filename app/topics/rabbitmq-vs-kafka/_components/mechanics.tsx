"use client";

import Link from "next/link";

import { StatsBar } from "@/components/simulation/stats-bar";
import { Term } from "@/components/study/term";

import { GLOSSARY } from "../_lib/glossary";
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
    {
      label: (
        <>
          RabbitMQ <Term id="ack" glossary={GLOSSARY}>acked</Term> (deleted)
        </>
      ),
      value: snapshot.rabbitAckedTotal,
      color: "var(--status-up)",
    },
    { label: "RabbitMQ waiting", value: snapshot.rabbitMessages.filter((m) => m.phase === "queued").length },
    {
      label: (
        <>
          Kafka <Term id="log" glossary={GLOSSARY}>log</Term> size
        </>
      ),
      value: snapshot.kafkaLog.length,
    },
    {
      label: (
        <>
          Kafka <Term id="eviction" glossary={GLOSSARY}>evicted</Term> (<Term id="retention" glossary={GLOSSARY}>retention</Term>)
        </>
      ),
      value: snapshot.kafkaExpiredTotal,
      color: "var(--status-down)",
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-panel-raised px-4 py-2.5 text-xs text-text-muted">
          <span>
            New here? This page assumes the vocabulary below — hover any underlined word for a
            quick definition, or
          </span>
          <Link href="/topics/rabbitmq-vs-kafka/study" className="font-medium text-accent hover:underline">
            start with Study →
          </Link>
        </div>
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
