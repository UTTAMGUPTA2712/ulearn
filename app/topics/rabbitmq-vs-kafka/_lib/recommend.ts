import type { Recommendation, Requirements, TraitReason } from "./types";

/** One trait's point contribution to each broker's score, plus the sentence explaining why — omitted when the trait doesn't meaningfully favor either side. */
type TraitScore = { rabbit: number; kafka: number; reason?: TraitReason };

function scoreReplay(v: Requirements["replay"]): TraitScore {
  if (v === "replay") {
    return {
      rabbit: 0,
      kafka: 2,
      reason: {
        broker: "kafka",
        text: "You need to replay history. Kafka keeps a message on disk for its configured retention window regardless of whether anyone's read it — replay is just resetting a consumer group's offset. A classic RabbitMQ queue deletes a message the moment it's acked; there's nothing left to replay.",
      },
    };
  }
  return { rabbit: 0.5, kafka: 0 };
}

function scoreRouting(v: Requirements["routing"]): TraitScore {
  if (v === "complex") {
    return {
      rabbit: 2,
      kafka: 0,
      reason: {
        broker: "rabbitmq",
        text: "Routing depends on message content. RabbitMQ's exchanges (direct, topic, fanout, headers) let a binding decide where a message goes based on its routing key or headers. Kafka only routes by partition key — everything past that is \"consume the whole topic and filter it yourself.\"",
      },
    };
  }
  return { rabbit: 0, kafka: 0.5 };
}

function scoreThroughput(v: Requirements["throughput"]): TraitScore {
  if (v === "high") {
    return {
      rabbit: 0,
      kafka: 2,
      reason: {
        broker: "kafka",
        text: "This is firehose-scale traffic. Kafka splits a topic into partitions spread across brokers, so one logical stream scales horizontally by adding partitions. A RabbitMQ queue is a single ordered log owned by one process — you can shard across many queues by hand, but there's no built-in partitioning to reach for.",
      },
    };
  }
  return {
    rabbit: 1,
    kafka: 0,
    reason: {
      broker: "rabbitmq",
      text: "Moderate volume doesn't need a partitioned log to keep up. A single well-configured RabbitMQ queue (or a handful, sharded manually) handles this comfortably, with a much simpler operational footprint than running a Kafka cluster.",
    },
  };
}

function scoreOrdering(v: Requirements["ordering"]): TraitScore {
  if (v === "per-key") {
    return {
      rabbit: 0,
      kafka: 2,
      reason: {
        broker: "kafka",
        text: "You need ordering per key (e.g. per customer, per order). Kafka guarantees order within a partition, and the default partitioner sends every message with the same key to the same partition — per-key order falls out for free.",
      },
    };
  }
  if (v === "strict") {
    return {
      rabbit: 0.5,
      kafka: 1,
      reason: {
        broker: "kafka",
        text: "Strict, global ordering is expensive in both systems — it means giving up parallelism. Kafka gets you there cheaply only by using a single partition; RabbitMQ gets you there only with a single queue and a single consumer. Neither one makes \"everything in exact order, fully parallel\" possible — that combination doesn't exist.",
      },
    };
  }
  return { rabbit: 0, kafka: 0 };
}

function scoreConsumers(v: Requirements["consumers"]): TraitScore {
  if (v === "fanout") {
    return {
      rabbit: 0,
      kafka: 2,
      reason: {
        broker: "kafka",
        text: "Several independent systems each need the full stream. Kafka consumer groups track their own offset independently — ten teams can each read the same topic at their own pace with zero coordination. In RabbitMQ, each independent consumer needs its own queue bound to the exchange, which means its own copy of every message from the moment it's created.",
      },
    };
  }
  return {
    rabbit: 2,
    kafka: 0,
    reason: {
      broker: "rabbitmq",
      text: "This is a worker pool pulling discrete jobs off one backlog. RabbitMQ's competing-consumer queue — per-message ack, prefetch limits, priority queues — is purpose-built for exactly this. Kafka caps your parallelism at the partition count and only gives you offset commits, not a per-message ack.",
    },
  };
}

function scoreRetention(v: Requirements["retention"]): TraitScore {
  if (v === "durable") {
    return {
      rabbit: 0,
      kafka: 2,
      reason: {
        broker: "kafka",
        text: "You need this data to stick around as a system of record, not just until it's processed. That's Kafka's default posture — a topic is a durable, replicated log with a retention policy you control, not a transient handoff.",
      },
    };
  }
  return { rabbit: 1, kafka: 0 };
}

/**
 * Scores both architectures against six independent workload traits and
 * returns a leader plus the plain-language reason for every trait that
 * meaningfully pushed the score one way. Deliberately simple (sum of
 * per-trait points, no weighting) — the value is in the attributed
 * reasoning, not in pretending this is a precise formula.
 */
export function recommend(req: Requirements): Recommendation {
  const scores: TraitScore[] = [
    scoreReplay(req.replay),
    scoreRouting(req.routing),
    scoreThroughput(req.throughput),
    scoreOrdering(req.ordering),
    scoreConsumers(req.consumers),
    scoreRetention(req.retention),
  ];

  const rabbitScore = scores.reduce((sum, s) => sum + s.rabbit, 0);
  const kafkaScore = scores.reduce((sum, s) => sum + s.kafka, 0);
  const reasons = scores.map((s) => s.reason).filter((r): r is TraitReason => r !== undefined);

  const diff = kafkaScore - rabbitScore;
  const leader = Math.abs(diff) < 1 ? "either" : diff > 0 ? "kafka" : "rabbitmq";

  return { leader, rabbitScore, kafkaScore, reasons };
}
