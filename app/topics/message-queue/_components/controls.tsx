import { Button } from "@/components/simulation/button";
import { StatusDot } from "@/components/ui/status-dot";

import type { BackpressurePolicy, ConsumerState, DeliveryMode } from "../_lib/types";

export function DeliveryModeSwitch({ mode, onChange }: { mode: DeliveryMode; onChange: (m: DeliveryMode) => void }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Delivery mode</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button active={mode === "queue"} onClick={() => onChange("queue")}>
          Work queue
        </Button>
        <Button active={mode === "fanout"} onClick={() => onChange("fanout")}>
          Fan-out (pub/sub)
        </Button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-text-faint">
        {mode === "queue"
          ? "One shared backlog — each message is delivered to exactly one consumer, whichever is free first."
          : "Every consumer gets its own copy of every message, and keeps its own backlog if it falls behind."}
      </p>
    </div>
  );
}

export function BrokerConfig({
  capacity,
  processingTimeMs,
  failureRate,
  visibilityTimeoutMs,
  maxRetries,
  backpressurePolicy,
  onSetCapacity,
  onSetProcessingTimeMs,
  onSetFailureRate,
  onSetVisibilityTimeoutMs,
  onSetMaxRetries,
  onSetBackpressurePolicy,
}: {
  capacity: number;
  processingTimeMs: number;
  failureRate: number;
  visibilityTimeoutMs: number;
  maxRetries: number;
  backpressurePolicy: BackpressurePolicy;
  onSetCapacity: (n: number) => void;
  onSetProcessingTimeMs: (ms: number) => void;
  onSetFailureRate: (rate: number) => void;
  onSetVisibilityTimeoutMs: (ms: number) => void;
  onSetMaxRetries: (n: number) => void;
  onSetBackpressurePolicy: (p: BackpressurePolicy) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Broker config</p>
      <div className="mt-2 space-y-2.5 rounded-xl border border-border bg-panel p-3">
        <label className="flex items-center gap-2 text-[11px] text-text-muted">
          backlog capacity
          <input
            type="range"
            min={3}
            max={24}
            value={capacity}
            onChange={(e) => onSetCapacity(Number(e.target.value))}
            className="min-w-0 flex-1 accent-accent"
          />
          <span className="w-6 shrink-0 text-right font-mono">{capacity}</span>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-text-muted">
          processing time
          <input
            type="range"
            min={300}
            max={3000}
            step={100}
            value={processingTimeMs}
            onChange={(e) => onSetProcessingTimeMs(Number(e.target.value))}
            className="min-w-0 flex-1 accent-accent"
          />
          <span className="w-12 shrink-0 text-right font-mono">{(processingTimeMs / 1000).toFixed(1)}s</span>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-text-muted">
          job failure rate
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={Math.round(failureRate * 100)}
            onChange={(e) => onSetFailureRate(Number(e.target.value) / 100)}
            className="min-w-0 flex-1 accent-accent"
          />
          <span className="w-10 shrink-0 text-right font-mono">{Math.round(failureRate * 100)}%</span>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-text-muted">
          visibility timeout
          <input
            type="range"
            min={500}
            max={6000}
            step={100}
            value={visibilityTimeoutMs}
            onChange={(e) => onSetVisibilityTimeoutMs(Number(e.target.value))}
            className="min-w-0 flex-1 accent-accent"
          />
          <span className="w-12 shrink-0 text-right font-mono">{(visibilityTimeoutMs / 1000).toFixed(1)}s</span>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-text-muted">
          max retries
          <input
            type="range"
            min={1}
            max={6}
            value={maxRetries}
            onChange={(e) => onSetMaxRetries(Number(e.target.value))}
            className="min-w-0 flex-1 accent-accent"
          />
          <span className="w-6 shrink-0 text-right font-mono">{maxRetries}</span>
        </label>

        <div className="pt-1">
          <p className="text-[11px] text-text-faint">backpressure, once the backlog is full</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Button active={backpressurePolicy === "drop"} onClick={() => onSetBackpressurePolicy("drop")}>
              Drop new messages
            </Button>
            <Button active={backpressurePolicy === "block"} onClick={() => onSetBackpressurePolicy("block")}>
              Pause producer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrafficControls({
  autoPublish,
  autoPublishRate,
  onPublishOne,
  onPublishBurst,
  onSetAutoPublish,
}: {
  autoPublish: boolean;
  autoPublishRate: number;
  onPublishOne: () => void;
  onPublishBurst: () => void;
  onSetAutoPublish: (enabled: boolean, rate?: number) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Traffic</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button primary onClick={onPublishOne}>Publish one</Button>
        <Button onClick={onPublishBurst}>Publish burst</Button>
        <Button active={autoPublish} onClick={() => onSetAutoPublish(!autoPublish)}>
          {autoPublish ? "Stop auto-publish" : "Start auto-publish"}
        </Button>
        {autoPublish && (
          <label className="flex items-center gap-1.5 text-sm text-text-muted">
            rate
            <input
              type="range"
              min={1}
              max={15}
              value={autoPublishRate}
              onChange={(e) => onSetAutoPublish(true, Number(e.target.value))}
              className="accent-accent"
            />
            <span className="font-mono">{autoPublishRate}/s</span>
          </label>
        )}
      </div>
    </div>
  );
}

export function ConsumerPanel({
  mode,
  capacity,
  consumers,
  onAddConsumer,
  onRemoveConsumer,
  onKillConsumer,
}: {
  mode: DeliveryMode;
  capacity: number;
  consumers: ConsumerState[];
  onAddConsumer: () => void;
  onRemoveConsumer: () => void;
  onKillConsumer: (id: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Consumers</p>
        <div className="flex gap-1.5">
          <Button onClick={onAddConsumer} disabled={consumers.length >= 5}>
            + Add
          </Button>
          <Button onClick={onRemoveConsumer} disabled={consumers.length <= 1}>
            − Remove
          </Button>
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {consumers.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-panel p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-xs text-text">
                <StatusDot status={c.status === "crashed" ? "down" : c.status === "processing" ? "active" : "idle"} />
                C{c.id}
              </span>
              <Button
                danger
                onClick={() => onKillConsumer(c.id)}
                disabled={c.status === "crashed"}
                aria-label={`Kill consumer C${c.id}`}
              >
                Kill
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-text-faint">
              {c.status === "crashed" ? "crashed — restarting…" : c.status === "processing" ? "processing a message" : "idle, waiting for work"}
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-text-faint">
              <span className="text-status-up">{c.processed} processed</span>
              <span className="text-status-down">{c.failed} failed</span>
            </div>
            {mode === "fanout" && (
              <p className="mt-1 font-mono text-[10px] text-text-faint">
                own backlog: {c.queueLength}/{capacity}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
