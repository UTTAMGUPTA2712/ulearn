import type {
  ExpiryFlash,
  KafkaEntry,
  KafkaGroup,
  MechanicsSnapshot,
  RabbitConsumer,
  RabbitMessage,
} from "./mechanics-types";

const TO_CONSUMER_MS = 220;
/** How long a message sits "acked" before it visually vanishes — long enough to register as an event, not a state. */
const ACK_LINGER_MS = 260;
/** How long a Kafka entry's red expiry flash stays visible — the entry itself is already gone from the array by then. */
const EXPIRY_FLASH_MS = 420;

const MIN_CONSUMERS = 1;
const MAX_CONSUMERS = 4;
const MAX_GROUPS = 3;
const GROUP_LABELS = ["Group A", "Group B", "Group C"];

/** Safety valve so a runaway auto-publish rate can't grow the array without bound. */
const MAX_RABBIT_MESSAGES = 60;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

let eventIdCounter = 0;
let consumerIdCounter = 0;
let groupIdCounter = 0;

/**
 * Runs two independent, minimal broker models off one shared event stream,
 * so the same published event visibly has a different fate on each side.
 * This intentionally does *not* model failures, retries or backpressure —
 * that's `message-queue`'s job. The only thing this engine exists to show
 * is push-and-delete vs. pull-and-retain.
 */
export class MechanicsEngine {
  now = 0;
  // Starts off so a first-time viewer sees a static, inspectable diagram and
  // clicks "Publish one" deliberately, instead of a live stream starting
  // before they've had a chance to read what anything on screen means.
  autoPublish = false;
  publishRate = 1.5;
  private spawnAccumulator = 0;

  rabbitConsumers: RabbitConsumer[] = [];
  rabbitMessages: RabbitMessage[] = [];
  rabbitAckedTotal = 0;

  kafkaLog: KafkaEntry[] = [];
  kafkaCapacity = 10;
  kafkaGroups: KafkaGroup[] = [];
  kafkaExpiredTotal = 0;
  kafkaExpiryFlashes: ExpiryFlash[] = [];

  constructor() {
    this.rabbitConsumers.push(this.freshConsumer(), this.freshConsumer());
    this.kafkaGroups.push(this.freshGroup());
  }

  private freshConsumer(): RabbitConsumer {
    return { id: consumerIdCounter++, status: "idle", messageId: null };
  }

  private freshGroup(): KafkaGroup {
    const earliest = this.kafkaLog[0]?.id ?? eventIdCounter;
    return {
      id: groupIdCounter++,
      label: GROUP_LABELS[this.kafkaGroups.length % GROUP_LABELS.length],
      // A newly-attached group starts from the earliest entry still in the
      // log — replaying whatever backlog hasn't expired yet, exactly like a
      // real consumer group with no committed offset defaulting to earliest.
      nextOffset: earliest,
      pollRate: 1.2,
      pollAccumulator: 0,
      lastReadAt: null,
      fellBehindAt: null,
    };
  }

  setAutoPublish(enabled: boolean, rate?: number) {
    this.autoPublish = enabled;
    if (rate !== undefined) this.publishRate = rate;
  }

  addConsumer() {
    if (this.rabbitConsumers.length >= MAX_CONSUMERS) return;
    this.rabbitConsumers.push(this.freshConsumer());
  }

  removeConsumer() {
    if (this.rabbitConsumers.length <= MIN_CONSUMERS) return;
    const removed = this.rabbitConsumers.pop()!;
    this.rabbitMessages = this.rabbitMessages.filter((m) => m.consumerId !== removed.id);
  }

  addGroup() {
    if (this.kafkaGroups.length >= MAX_GROUPS) return;
    this.kafkaGroups.push(this.freshGroup());
  }

  removeGroup() {
    if (this.kafkaGroups.length <= 1) return;
    this.kafkaGroups.pop();
  }

  setGroupPollRate(id: number, rate: number) {
    const group = this.kafkaGroups.find((g) => g.id === id);
    if (group) group.pollRate = Math.max(0, Math.min(6, rate));
  }

  setKafkaCapacity(n: number) {
    this.kafkaCapacity = Math.max(4, Math.min(20, n));
  }

  publishOne() {
    this.spawnEvent();
  }

  private spawnEvent() {
    if (this.rabbitMessages.length >= MAX_RABBIT_MESSAGES) return;
    const id = eventIdCounter++;

    this.rabbitMessages.push({
      id,
      phase: "queued",
      phaseStart: this.now,
      phaseDuration: 0,
      consumerId: null,
    });

    this.kafkaLog.push({ id, publishedAt: this.now });
    while (this.kafkaLog.length > this.kafkaCapacity) {
      const removed = this.kafkaLog.shift()!;
      this.kafkaExpiredTotal++;
      this.kafkaExpiryFlashes.push({ id: removed.id, spawnedAt: this.now });
    }

    // Retention doesn't care who's still reading — a group sitting on (or
    // behind) an id that just aged out gets snapped forward to whatever's
    // now the oldest available entry, same as a real lagging consumer that
    // falls outside the retention window.
    const earliest = this.kafkaLog[0]?.id ?? eventIdCounter;
    for (const g of this.kafkaGroups) {
      if (g.nextOffset < earliest) {
        g.nextOffset = earliest;
        g.fellBehindAt = this.now;
      }
    }
  }

  private tickRabbit() {
    for (const c of this.rabbitConsumers) {
      if (c.status !== "idle") continue;
      const next = this.rabbitMessages.find((m) => m.phase === "queued");
      if (!next) continue;
      next.phase = "to-consumer";
      next.phaseStart = this.now;
      next.phaseDuration = TO_CONSUMER_MS;
      next.consumerId = c.id;
      c.status = "processing";
      c.messageId = next.id;
    }

    for (const m of this.rabbitMessages) {
      if (m.phase === "queued") continue;
      const elapsed = this.now - m.phaseStart;
      if (elapsed < m.phaseDuration) continue;

      if (m.phase === "to-consumer") {
        m.phase = "processing";
        m.phaseStart = this.now;
        m.phaseDuration = randomBetween(700, 1100);
      } else if (m.phase === "processing") {
        const consumer = this.rabbitConsumers.find((c) => c.id === m.consumerId);
        if (consumer) {
          consumer.status = "idle";
          consumer.messageId = null;
        }
        this.rabbitAckedTotal++;
        m.phase = "acked";
        m.phaseStart = this.now;
        m.phaseDuration = ACK_LINGER_MS;
      }
    }

    this.rabbitMessages = this.rabbitMessages.filter(
      (m) => !(m.phase === "acked" && this.now - m.phaseStart >= m.phaseDuration),
    );
  }

  private tickKafka(deltaMs: number) {
    const latestId = eventIdCounter - 1;

    for (const g of this.kafkaGroups) {
      g.pollAccumulator += (g.pollRate * deltaMs) / 1000;

      while (g.pollAccumulator >= 1) {
        if (g.nextOffset > latestId) {
          // Caught up to the live edge — nothing new to pull yet. Don't let
          // the accumulator bank a huge backlog while idle.
          g.pollAccumulator = Math.min(g.pollAccumulator, 1);
          break;
        }
        const earliest = this.kafkaLog[0]?.id ?? eventIdCounter;
        if (g.nextOffset < earliest) {
          g.nextOffset = earliest;
          g.fellBehindAt = this.now;
          continue;
        }
        g.lastReadAt = this.now;
        g.nextOffset += 1;
        g.pollAccumulator -= 1;
      }
    }

    this.kafkaExpiryFlashes = this.kafkaExpiryFlashes.filter((f) => this.now - f.spawnedAt < EXPIRY_FLASH_MS);
  }

  tick(deltaMs: number) {
    this.now += deltaMs;

    if (this.autoPublish) {
      this.spawnAccumulator += (this.publishRate * deltaMs) / 1000;
      while (this.spawnAccumulator >= 1) {
        this.spawnAccumulator -= 1;
        this.spawnEvent();
      }
    }

    this.tickRabbit();
    this.tickKafka(deltaMs);
  }

  getSnapshot(): MechanicsSnapshot {
    return {
      now: this.now,
      autoPublish: this.autoPublish,
      publishRate: this.publishRate,
      nextEventId: eventIdCounter,
      rabbitConsumers: this.rabbitConsumers.map((c) => ({ ...c })),
      rabbitMessages: this.rabbitMessages.map((m) => ({ ...m })),
      rabbitAckedTotal: this.rabbitAckedTotal,
      kafkaLog: this.kafkaLog.map((e) => ({ ...e })),
      kafkaCapacity: this.kafkaCapacity,
      kafkaGroups: this.kafkaGroups.map((g) => ({ ...g })),
      kafkaExpiredTotal: this.kafkaExpiredTotal,
      kafkaExpiryFlashes: this.kafkaExpiryFlashes.map((f) => ({ ...f })),
    };
  }
}
