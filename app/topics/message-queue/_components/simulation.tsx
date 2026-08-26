"use client";

import { EventLog } from "@/components/simulation/event-log";
import { StatsBar } from "@/components/simulation/stats-bar";

import { useMessageQueueSimulation } from "../_lib/use-simulation";
import { BrokerConfig, ConsumerPanel, DeliveryModeSwitch, TrafficControls } from "./controls";
import { MessageQueueDiagram } from "./diagram";

export function MessageQueueSimulation() {
  const {
    snapshot,
    setMode,
    setBackpressurePolicy,
    setCapacity,
    setProcessingTimeMs,
    setFailureRate,
    setVisibilityTimeoutMs,
    setMaxRetries,
    setAutoPublish,
    addConsumer,
    removeConsumer,
    killConsumer,
    publishOne,
    publishBurst,
  } = useMessageQueueSimulation();

  const statItems = [
    { label: "published", value: snapshot.stats.published },
    { label: "acked", value: snapshot.stats.acked, color: "var(--status-up)" },
    { label: "retried", value: snapshot.stats.retried, color: "var(--status-warn)" },
    { label: "dead-lettered", value: snapshot.stats.deadLettered, color: "var(--status-down)" },
    { label: "dropped (backpressure)", value: snapshot.stats.dropped, color: "var(--status-down)" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <StatsBar items={statItems} />
        <div className="h-[460px] shrink-0 rounded-2xl border border-border bg-panel shadow-sm">
          <MessageQueueDiagram
            mode={snapshot.mode}
            now={snapshot.now}
            capacity={snapshot.capacity}
            queueLength={snapshot.queueLength}
            consumers={snapshot.consumers}
            messages={snapshot.messages}
            dlqCount={snapshot.dlqCount}
            producerBlocked={snapshot.producerBlocked}
            autoPublish={snapshot.autoPublish}
          />
        </div>
        <ConsumerPanel
          mode={snapshot.mode}
          capacity={snapshot.capacity}
          consumers={snapshot.consumers}
          onAddConsumer={addConsumer}
          onRemoveConsumer={removeConsumer}
          onKillConsumer={killConsumer}
        />
        <EventLog className="flex flex-1 flex-col" entries={snapshot.log} />
      </div>

      <div className="flex flex-col gap-6">
        <DeliveryModeSwitch mode={snapshot.mode} onChange={setMode} />
        <BrokerConfig
          capacity={snapshot.capacity}
          processingTimeMs={snapshot.processingTimeMs}
          failureRate={snapshot.failureRate}
          visibilityTimeoutMs={snapshot.visibilityTimeoutMs}
          maxRetries={snapshot.maxRetries}
          backpressurePolicy={snapshot.backpressurePolicy}
          onSetCapacity={setCapacity}
          onSetProcessingTimeMs={setProcessingTimeMs}
          onSetFailureRate={setFailureRate}
          onSetVisibilityTimeoutMs={setVisibilityTimeoutMs}
          onSetMaxRetries={setMaxRetries}
          onSetBackpressurePolicy={setBackpressurePolicy}
        />
        <TrafficControls
          autoPublish={snapshot.autoPublish}
          autoPublishRate={snapshot.autoPublishRate}
          onPublishOne={publishOne}
          onPublishBurst={publishBurst}
          onSetAutoPublish={setAutoPublish}
        />
      </div>
    </div>
  );
}
