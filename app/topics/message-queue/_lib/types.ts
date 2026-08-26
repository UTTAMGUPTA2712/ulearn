/**
 * Types for the message queue / event-driven-architecture simulation.
 * Colocated with this topic's route on purpose — nothing here is shared
 * with other topics.
 *
 * The simulation models two generic delivery shapes rather than any one
 * broker product: `"queue"` (competing consumers pull from one shared,
 * bounded backlog — classic work-queue / SQS / RabbitMQ-worker style) and
 * `"fanout"` (every consumer gets its own copy of every message — pub/sub /
 * topic / Kafka-consumer-group style). See `MessageQueueEngine.setMode`.
 */

export type DeliveryMode = "queue" | "fanout";

/** What happens to a new message when the broker is at capacity — see `MessageQueueEngine.spawn`. */
export type BackpressurePolicy = "drop" | "block";

export type ConsumerStatus = "idle" | "processing" | "crashed";

export interface ConsumerState {
  id: number;
  status: ConsumerStatus;
  currentMessageId: number | null;
  processed: number;
  failed: number;
  /** Set while `status === "crashed"`; the consumer auto-restarts once `now` passes this. */
  respawnAt: number | null;
  /** Fanout mode only: how many messages are waiting in this consumer's own backlog. */
  queueLength: number;
}

/**
 * `queued` — waiting in a backlog (shared, in queue mode; per-consumer, in
 * fanout mode), not animated as a moving dot.
 * `stuck` — its consumer crashed mid-job; invisible to the broker until the
 * visibility timeout expires, then redelivered — see §"Visibility timeout".
 * `to-requeue` / `to-dlq` — a failed or crashed job traveling back from its
 * consumer, either to re-enter its backlog or to the dead-letter queue once
 * retries are exhausted.
 */
export type MessagePhase =
  | "to-broker"
  | "queued"
  | "to-consumer"
  | "processing"
  | "stuck"
  | "to-requeue"
  | "to-dlq"
  | "acked"
  | "dropped"
  | "done";

export type MessageOutcome = "acked" | "dead-lettered" | "dropped";

export interface Message {
  id: number;
  attempts: number;
  /** Fanout mode: which consumer's private backlog this copy belongs to. Undefined in queue mode (shared backlog). */
  queueOwner: number | null;
  consumerId: number | null;
  phase: MessagePhase;
  phaseStart: number;
  phaseDuration: number;
  outcome: MessageOutcome | null;
}

export interface LogEntry {
  id: number;
  time: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface Stats {
  published: number;
  acked: number;
  retried: number;
  deadLettered: number;
  /** Rejected outright by backpressure — see `BackpressurePolicy`. */
  dropped: number;
}

export interface SimSnapshot {
  now: number;
  mode: DeliveryMode;
  backpressurePolicy: BackpressurePolicy;
  capacity: number;
  processingTimeMs: number;
  failureRate: number;
  visibilityTimeoutMs: number;
  maxRetries: number;
  consumers: ConsumerState[];
  /** Shared backlog length in queue mode; sum of per-consumer backlogs in fanout mode. */
  queueLength: number;
  messages: Message[];
  dlqCount: number;
  log: LogEntry[];
  stats: Stats;
  autoPublish: boolean;
  autoPublishRate: number;
  /** True while the "block" backpressure policy is holding the producer back. */
  producerBlocked: boolean;
}
