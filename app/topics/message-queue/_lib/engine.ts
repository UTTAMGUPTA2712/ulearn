import type {
  BackpressurePolicy,
  ConsumerState,
  DeliveryMode,
  LogEntry,
  Message,
  SimSnapshot,
} from "./types";

const TO_BROKER_MS = 260;
const TO_CONSUMER_MS = 220;
const REQUEUE_MS = 260;
const TO_DLQ_MS = 260;
const LINGER_MS = 260;
/** How long a backpressure-rejected message flashes near the broker edge before disappearing. */
const DROPPED_FLASH_MS = 420;
/** How long a crashed consumer stays dead before it auto-restarts, empty and ready for new work. */
const RESPAWN_MS = 1800;
/** Stagger between messages in a "Publish burst", so they read as a trailing stream rather than one clump. */
const BURST_STAGGER_MS = 70;
const BURST_COUNT = 8;

const MIN_CONSUMERS = 1;
const MAX_CONSUMERS = 5;
const DEFAULT_CONSUMER_COUNT = 3;

/** Safety valve so a runaway auto-publish + fanout combination can't grow the array without bound. */
const MAX_VISIBLE_MESSAGES = 90;
const MAX_LOG_LINES = 60;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

let messageIdCounter = 0;
let logIdCounter = 0;

/**
 * Owns the entire simulated world: the broker's backlog(s), every consumer's
 * state, in-flight messages and a short event log. Mutated in place on every
 * `tick()` — `getSnapshot()` is the only thing that leaves the engine.
 *
 * Models two generic delivery shapes rather than one broker product — see
 * `DeliveryMode` in `./types`. Switching modes resets the run: a "queued"
 * message's `queueOwner` means something different in each (shared vs.
 * per-consumer backlog), so carrying state across the switch would leave the
 * assignment logic looking at a backlog that no longer means what it says.
 */
export class MessageQueueEngine {
  now = 0;
  mode: DeliveryMode = "queue";
  backpressurePolicy: BackpressurePolicy = "drop";
  capacity = 10;
  processingTimeMs = 900;
  /** 0–1. Probability a completed job fails (nack) instead of acking — an application-level error, not a crash. */
  failureRate = 0.15;
  visibilityTimeoutMs = 2200;
  maxRetries = 3;
  autoPublish = false;
  autoPublishRate = 2;
  /** True while the "block" backpressure policy is holding new publishes back. */
  producerBlocked = false;

  messages: Message[] = [];
  consumers: ConsumerState[] = [];
  log: LogEntry[] = [];
  stats = { published: 0, acked: 0, retried: 0, deadLettered: 0, dropped: 0 };
  dlqCount = 0;

  private spawnAccumulator = 0;
  private nextConsumerId = 0;

  constructor() {
    for (let i = 0; i < DEFAULT_CONSUMER_COUNT; i++) this.consumers.push(this.freshConsumer());
  }

  private freshConsumer(): ConsumerState {
    return {
      id: this.nextConsumerId++,
      status: "idle",
      currentMessageId: null,
      processed: 0,
      failed: 0,
      respawnAt: null,
      queueLength: 0,
    };
  }

  private addLog(level: LogEntry["level"], message: string) {
    this.log.push({ id: logIdCounter++, time: this.now, level, message });
    if (this.log.length > MAX_LOG_LINES) this.log.shift();
  }

  setMode(mode: DeliveryMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.messages = [];
    this.consumers = [];
    for (let i = 0; i < DEFAULT_CONSUMER_COUNT; i++) this.consumers.push(this.freshConsumer());
    this.stats = { published: 0, acked: 0, retried: 0, deadLettered: 0, dropped: 0 };
    this.dlqCount = 0;
    this.producerBlocked = false;
    this.addLog(
      "info",
      mode === "queue"
        ? "Switched to work queue — one shared backlog, each message goes to exactly one consumer"
        : "Switched to fanout — every consumer gets its own copy of every message",
    );
  }

  setBackpressurePolicy(policy: BackpressurePolicy) {
    this.backpressurePolicy = policy;
    this.producerBlocked = false;
    this.addLog(
      "info",
      policy === "drop"
        ? "Backpressure policy: drop new messages once the backlog is full"
        : "Backpressure policy: pause the producer once the backlog is full",
    );
  }

  setCapacity(n: number) {
    this.capacity = Math.max(3, Math.min(24, n));
  }

  setProcessingTimeMs(ms: number) {
    this.processingTimeMs = Math.max(300, Math.min(3000, ms));
  }

  setFailureRate(rate: number) {
    this.failureRate = Math.max(0, Math.min(0.9, rate));
  }

  setVisibilityTimeoutMs(ms: number) {
    this.visibilityTimeoutMs = Math.max(500, Math.min(6000, ms));
  }

  setMaxRetries(n: number) {
    this.maxRetries = Math.max(1, Math.min(6, n));
  }

  setAutoPublish(enabled: boolean, rate?: number) {
    this.autoPublish = enabled;
    if (rate !== undefined) this.autoPublishRate = rate;
  }

  addConsumer() {
    if (this.consumers.length >= MAX_CONSUMERS) return;
    const consumer = this.freshConsumer();
    this.consumers.push(consumer);
    this.addLog("info", `Consumer C${consumer.id} added`);
  }

  /**
   * Scales a consumer down deliberately. Unlike a crash, there's no
   * pretending the operator didn't mean to do this: whatever that consumer
   * was holding or had queued (fanout mode's private backlog) is discarded
   * outright rather than routed through the crash/redelivery path.
   */
  removeConsumer() {
    if (this.consumers.length <= MIN_CONSUMERS) return;
    const removed = this.consumers.pop()!;
    const discarded = this.messages.filter(
      (m) => m.queueOwner === removed.id || m.consumerId === removed.id,
    ).length;
    this.messages = this.messages.filter(
      (m) => m.queueOwner !== removed.id && m.consumerId !== removed.id,
    );
    this.addLog(
      "warn",
      discarded > 0
        ? `Consumer C${removed.id} removed — ${discarded} in-flight/backlogged message(s) discarded`
        : `Consumer C${removed.id} removed`,
    );
  }

  /** Manual chaos button: kills a consumer mid-job, the same way an OOM-killed pod or a crashed process would. */
  killConsumer(id: number) {
    const consumer = this.consumers.find((c) => c.id === id);
    if (!consumer || consumer.status === "crashed") return;

    consumer.status = "crashed";
    consumer.respawnAt = this.now + RESPAWN_MS;

    const held = this.messages.find((m) => m.id === consumer.currentMessageId);
    if (held && (held.phase === "processing" || held.phase === "to-consumer")) {
      // The broker doesn't know yet — the message just goes quiet until the
      // visibility timeout expires, exactly like a real crashed worker.
      held.phase = "stuck";
      held.phaseStart = this.now;
      held.phaseDuration = this.visibilityTimeoutMs;
      this.addLog(
        "error",
        `Consumer C${id} crashed mid-job — message #${held.id} invisible for ${(this.visibilityTimeoutMs / 1000).toFixed(1)}s before redelivery`,
      );
    } else {
      this.addLog("error", `Consumer C${id} crashed`);
    }
  }

  /** Publishes one message. `extraDelayMs` staggers a burst's arrivals so they trail rather than clump — see `publishBurst`. */
  spawn(extraDelayMs = 0) {
    if (this.messages.length >= MAX_VISIBLE_MESSAGES) return;

    if (this.mode === "queue") {
      const waiting = this.messages.filter((m) => m.phase === "queued" && m.queueOwner === null).length;
      if (waiting >= this.capacity) {
        if (this.backpressurePolicy === "drop") {
          this.messages.push({
            id: messageIdCounter++,
            attempts: 0,
            queueOwner: null,
            consumerId: null,
            phase: "dropped",
            phaseStart: this.now,
            phaseDuration: DROPPED_FLASH_MS + extraDelayMs,
            outcome: "dropped",
          });
          this.stats.published++;
          this.stats.dropped++;
          this.addLog("warn", `Backlog full (${this.capacity}) — message dropped (backpressure)`);
        } else if (!this.producerBlocked) {
          this.producerBlocked = true;
          this.addLog("warn", `Backlog full (${this.capacity}) — producer paused (backpressure)`);
        }
        return;
      }
      if (this.producerBlocked) {
        this.producerBlocked = false;
        this.addLog("info", "Backlog has room again — producer resumed");
      }
      this.messages.push({
        id: messageIdCounter++,
        attempts: 0,
        queueOwner: null,
        consumerId: null,
        phase: "to-broker",
        phaseStart: this.now,
        phaseDuration: TO_BROKER_MS + extraDelayMs,
        outcome: null,
      });
      this.stats.published++;
      return;
    }

    // Fanout: deliver an independent copy to every live consumer's own
    // backlog. A crashed consumer simply doesn't receive one — a plain
    // pub/sub topic with no durable per-subscriber queue loses what a dead
    // subscriber missed, it doesn't hold it for them.
    let anyDropped = false;
    for (const c of this.consumers) {
      if (c.status === "crashed") continue;
      const waiting = this.messages.filter((m) => m.phase === "queued" && m.queueOwner === c.id).length;
      if (waiting >= this.capacity) {
        anyDropped = true;
        this.stats.dropped++;
        this.messages.push({
          id: messageIdCounter++,
          attempts: 0,
          queueOwner: c.id,
          consumerId: null,
          phase: "dropped",
          phaseStart: this.now,
          phaseDuration: DROPPED_FLASH_MS + extraDelayMs,
          outcome: "dropped",
        });
        continue;
      }
      this.messages.push({
        id: messageIdCounter++,
        attempts: 0,
        queueOwner: c.id,
        consumerId: null,
        phase: "to-broker",
        phaseStart: this.now,
        phaseDuration: TO_BROKER_MS + extraDelayMs,
        outcome: null,
      });
    }
    this.stats.published++;
    if (anyDropped) this.addLog("warn", "Fanout — at least one subscriber's backlog was full, that copy was dropped");
  }

  /** Fires a rapid burst so a growing backlog (and backpressure, if the consumers can't keep up) is easy to see happening. */
  publishBurst() {
    for (let i = 0; i < BURST_COUNT; i++) {
      if (this.messages.length >= MAX_VISIBLE_MESSAGES) break;
      this.spawn(i * BURST_STAGGER_MS);
    }
    this.addLog("info", `Published a burst of ${BURST_COUNT} messages`);
  }

  private assignIdleConsumers() {
    for (const c of this.consumers) {
      if (c.status !== "idle") continue;
      const owner = this.mode === "queue" ? null : c.id;
      const next = this.messages.find((m) => m.phase === "queued" && m.queueOwner === owner);
      if (!next) continue;

      next.phase = "to-consumer";
      next.phaseStart = this.now;
      next.phaseDuration = TO_CONSUMER_MS;
      next.consumerId = c.id;
      c.status = "processing";
      c.currentMessageId = next.id;
    }
  }

  private resolveProcessing(m: Message) {
    const consumer = this.consumers.find((c) => c.id === m.consumerId);
    if (!consumer) {
      // Its consumer was scaled down mid-job; removeConsumer() already
      // purges these, so this is just a safety net.
      m.phase = "done";
      m.phaseStart = this.now;
      m.phaseDuration = LINGER_MS;
      return;
    }

    consumer.processed++;
    consumer.status = "idle";
    consumer.currentMessageId = null;

    if (Math.random() < this.failureRate) {
      consumer.failed++;
      m.attempts++;
      if (m.attempts >= this.maxRetries) {
        m.phase = "to-dlq";
        m.phaseStart = this.now;
        m.phaseDuration = TO_DLQ_MS;
        m.outcome = "dead-lettered";
        this.stats.deadLettered++;
        this.addLog("error", `Message #${m.id} failed ${m.attempts}× — moved to the dead-letter queue`);
      } else {
        m.phase = "to-requeue";
        m.phaseStart = this.now;
        m.phaseDuration = REQUEUE_MS;
        this.stats.retried++;
        this.addLog("warn", `Message #${m.id} failed (attempt ${m.attempts}/${this.maxRetries}) — requeued`);
      }
      return;
    }

    m.phase = "acked";
    m.phaseStart = this.now;
    m.phaseDuration = LINGER_MS;
    m.outcome = "acked";
    this.stats.acked++;
  }

  private resolveStuck(m: Message) {
    m.attempts++;
    if (m.attempts >= this.maxRetries) {
      m.phase = "to-dlq";
      m.phaseStart = this.now;
      m.phaseDuration = TO_DLQ_MS;
      m.outcome = "dead-lettered";
      this.stats.deadLettered++;
      this.addLog("error", `Message #${m.id} exceeded retries after a crash — moved to the dead-letter queue`);
    } else {
      m.phase = "to-requeue";
      m.phaseStart = this.now;
      m.phaseDuration = REQUEUE_MS;
      this.stats.retried++;
      this.addLog(
        "warn",
        `Visibility timeout expired — message #${m.id} redelivered (attempt ${m.attempts}/${this.maxRetries})`,
      );
    }
  }

  tick(deltaMs: number) {
    this.now += deltaMs;

    for (const c of this.consumers) {
      if (c.status === "crashed" && c.respawnAt !== null && this.now >= c.respawnAt) {
        c.status = "idle";
        c.respawnAt = null;
        c.currentMessageId = null;
        this.addLog("info", `Consumer C${c.id} restarted`);
      }
    }

    if (this.autoPublish) {
      this.spawnAccumulator += (this.autoPublishRate * deltaMs) / 1000;
      while (this.spawnAccumulator >= 1) {
        this.spawnAccumulator -= 1;
        this.spawn();
      }
    }

    for (const m of this.messages) {
      if (m.phase === "done" || m.phase === "queued") continue;

      const elapsed = this.now - m.phaseStart;
      if (elapsed < m.phaseDuration) continue;

      switch (m.phase) {
        case "to-broker":
          m.phase = "queued";
          m.phaseStart = this.now;
          break;
        case "to-consumer":
          m.phase = "processing";
          m.phaseStart = this.now;
          m.phaseDuration = randomBetween(this.processingTimeMs * 0.7, this.processingTimeMs * 1.3);
          break;
        case "processing":
          this.resolveProcessing(m);
          break;
        case "stuck":
          this.resolveStuck(m);
          break;
        case "to-requeue":
          m.phase = "queued";
          m.phaseStart = this.now;
          m.consumerId = null;
          break;
        case "to-dlq":
          m.phase = "done";
          m.phaseStart = this.now;
          m.phaseDuration = LINGER_MS;
          this.dlqCount++;
          break;
        case "acked":
        case "dropped":
          m.phase = "done";
          m.phaseStart = this.now;
          m.phaseDuration = 1;
          break;
      }
    }

    this.assignIdleConsumers();

    for (const c of this.consumers) {
      const owner = this.mode === "queue" ? null : c.id;
      c.queueLength = this.messages.filter((m) => m.phase === "queued" && m.queueOwner === owner).length;
    }

    this.messages = this.messages.filter((m) => !(m.phase === "done" && this.now - m.phaseStart >= m.phaseDuration));
  }

  getSnapshot(): SimSnapshot {
    const queueLength =
      this.mode === "queue"
        ? this.messages.filter((m) => m.phase === "queued" && m.queueOwner === null).length
        : this.consumers.reduce((sum, c) => sum + c.queueLength, 0);

    return {
      now: this.now,
      mode: this.mode,
      backpressurePolicy: this.backpressurePolicy,
      capacity: this.capacity,
      processingTimeMs: this.processingTimeMs,
      failureRate: this.failureRate,
      visibilityTimeoutMs: this.visibilityTimeoutMs,
      maxRetries: this.maxRetries,
      consumers: this.consumers.map((c) => ({ ...c })),
      queueLength,
      messages: this.messages.map((m) => ({ ...m })),
      dlqCount: this.dlqCount,
      log: [...this.log],
      stats: { ...this.stats },
      autoPublish: this.autoPublish,
      autoPublishRate: this.autoPublishRate,
      producerBlocked: this.producerBlocked,
    };
  }
}
