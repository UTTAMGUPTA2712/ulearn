/**
 * Types for the mechanics simulation — the live "how they actually behave"
 * hub page, as opposed to the Match tab's decision tool or the Study tab's
 * prose. One shared event stream feeds two independent engines side by
 * side, so the same published event visibly has a different fate in each:
 * RabbitMQ pushes it to a free worker and deletes it on ack; Kafka appends
 * it to a log that independent consumer groups pull from at their own pace,
 * and it only ever disappears when retention evicts it — read or not.
 */

export interface RabbitConsumer {
  id: number;
  status: "idle" | "processing";
  messageId: number | null;
}

export type RabbitMessagePhase = "queued" | "to-consumer" | "processing" | "acked";

export interface RabbitMessage {
  id: number;
  phase: RabbitMessagePhase;
  phaseStart: number;
  phaseDuration: number;
  consumerId: number | null;
}

/** One entry in Kafka's log. Its position on screen is always `id - earliestVisibleId` — never stored, always derived, so a shifting window needs no special-casing. */
export interface KafkaEntry {
  id: number;
  publishedAt: number;
}

export interface KafkaGroup {
  id: number;
  label: string;
  /** The next event id this group will read — Kafka's "offset," one id ahead of the last thing it consumed. */
  nextOffset: number;
  /** Reads per second — independent per group, modeling "pull at your own pace." */
  pollRate: number;
  pollAccumulator: number;
  /** A brief highlight after this group reads something, so the pull is visible without a moving dot per read. */
  lastReadAt: number | null;
  /** Set for a moment when the group's offset had to jump forward because retention evicted what it was about to read. */
  fellBehindAt: number | null;
}

/** A brief red flash where a Kafka entry aged out of the log — purely visual, the entry is already gone from `kafkaLog`. */
export interface ExpiryFlash {
  id: number;
  spawnedAt: number;
}

export interface MechanicsSnapshot {
  now: number;
  autoPublish: boolean;
  publishRate: number;
  nextEventId: number;

  rabbitConsumers: RabbitConsumer[];
  rabbitMessages: RabbitMessage[];
  rabbitAckedTotal: number;

  kafkaLog: KafkaEntry[];
  kafkaCapacity: number;
  kafkaGroups: KafkaGroup[];
  kafkaExpiredTotal: number;
  kafkaExpiryFlashes: ExpiryFlash[];
}
