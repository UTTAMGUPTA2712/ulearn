import { Button } from "@/components/simulation/button";

import type { KafkaGroup, RabbitConsumer } from "../_lib/mechanics-types";

export function TrafficControls({
  autoPublish,
  publishRate,
  onPublishOne,
  onSetAutoPublish,
}: {
  autoPublish: boolean;
  publishRate: number;
  onPublishOne: () => void;
  onSetAutoPublish: (enabled: boolean, rate?: number) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">
        Shared event stream
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
        Every event published here happens on both sides at once — same event, different fate.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button primary onClick={onPublishOne}>
          Publish one
        </Button>
        <Button active={autoPublish} onClick={() => onSetAutoPublish(!autoPublish)}>
          {autoPublish ? "Stop auto-publish" : "Start auto-publish"}
        </Button>
        {autoPublish && (
          <label className="flex items-center gap-1.5 text-sm text-text-muted">
            rate
            <input
              type="range"
              min={0.5}
              max={6}
              step={0.5}
              value={publishRate}
              onChange={(e) => onSetAutoPublish(true, Number(e.target.value))}
              className="accent-accent"
            />
            <span className="font-mono">{publishRate}/s</span>
          </label>
        )}
      </div>
    </div>
  );
}

export function RabbitControls({
  consumers,
  onAddConsumer,
  onRemoveConsumer,
}: {
  consumers: RabbitConsumer[];
  onAddConsumer: () => void;
  onRemoveConsumer: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">
          RabbitMQ — push
        </p>
        <div className="flex gap-1.5">
          <Button onClick={onAddConsumer} disabled={consumers.length >= 4}>
            + Worker
          </Button>
          <Button onClick={onRemoveConsumer} disabled={consumers.length <= 1}>
            − Worker
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-text-faint">
        The broker hands each queued event to the first free worker. Once a worker acks it, it&apos;s
        deleted — for good.
      </p>
    </div>
  );
}

export function KafkaControls({
  capacity,
  groups,
  onSetCapacity,
  onAddGroup,
  onRemoveGroup,
  onSetGroupPollRate,
}: {
  capacity: number;
  groups: KafkaGroup[];
  onSetCapacity: (n: number) => void;
  onAddGroup: () => void;
  onRemoveGroup: () => void;
  onSetGroupPollRate: (id: number, rate: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">
          Kafka — pull
        </p>
        <div className="flex gap-1.5">
          <Button onClick={onAddGroup} disabled={groups.length >= 3}>
            + Group
          </Button>
          <Button onClick={onRemoveGroup} disabled={groups.length <= 1}>
            − Group
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-text-faint">
        Nothing here is ever deleted by a read. A new group starts from the oldest event still in
        the log — try adding one mid-run.
      </p>

      <label className="mt-3 flex items-center gap-2 text-[11px] text-text-muted">
        retains last
        <input
          type="range"
          min={4}
          max={20}
          value={capacity}
          onChange={(e) => onSetCapacity(Number(e.target.value))}
          className="min-w-0 flex-1 accent-accent"
        />
        <span className="w-16 shrink-0 text-right font-mono">{capacity} events</span>
      </label>

      <div className="mt-3 space-y-2">
        {groups.map((g) => (
          <label key={g.id} className="flex items-center gap-2 text-[11px] text-text-muted">
            {g.label} poll rate
            <input
              type="range"
              min={0}
              max={6}
              step={0.2}
              value={g.pollRate}
              onChange={(e) => onSetGroupPollRate(g.id, Number(e.target.value))}
              className="min-w-0 flex-1 accent-accent"
            />
            <span className="w-14 shrink-0 text-right font-mono">{g.pollRate.toFixed(1)}/s</span>
          </label>
        ))}
      </div>
    </div>
  );
}
