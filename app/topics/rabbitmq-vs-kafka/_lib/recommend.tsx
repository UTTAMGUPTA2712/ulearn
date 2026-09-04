import { Term } from "@/components/study/term";

import { GLOSSARY } from "./glossary";
import type { Recommendation, Requirements, TraitReason } from "./types";

/** Shorthand so every reason below reads as prose, not a wall of `<Term id="..." glossary={GLOSSARY}>`. */
function T({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Term id={id} glossary={GLOSSARY}>
      {children}
    </Term>
  );
}

/** One trait's point contribution to each broker's score, plus the sentence explaining why — omitted when the trait doesn't meaningfully favor either side. */
type TraitScore = { rabbit: number; kafka: number; reason?: Omit<TraitReason, "id"> };

function scoreReplay(v: Requirements["replay"]): TraitScore {
  if (v === "replay") {
    return {
      rabbit: 0,
      kafka: 2,
      reason: {
        broker: "kafka",
        text: (
          <>
            You need to replay history. Kafka keeps a message on disk for its configured{" "}
            <T id="retention">retention</T> window regardless of whether anyone&apos;s read it —
            replay is just resetting a <T id="consumer-group">consumer group</T>&apos;s{" "}
            <T id="offset">offset</T>. A classic RabbitMQ <T id="queue">queue</T> deletes a
            message the moment it&apos;s <T id="ack">acked</T>; there&apos;s nothing left to
            replay.
          </>
        ),
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
        text: (
          <>
            Routing depends on message content. RabbitMQ&apos;s <T id="exchange">exchanges</T>{" "}
            (direct, topic, fanout, headers) let a <T id="binding">binding</T> decide where a
            message goes based on its routing key or headers. Kafka only routes by{" "}
            <T id="partition-key">partition key</T> — everything past that is &ldquo;consume the
            whole topic and filter it yourself.&rdquo;
          </>
        ),
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
        text: (
          <>
            This is firehose-scale traffic. Kafka splits a topic into{" "}
            <T id="partition">partitions</T> spread across brokers, so one logical stream scales
            horizontally by adding partitions. A RabbitMQ <T id="queue">queue</T> is a single
            ordered log owned by one process — you can shard across many queues by hand, but
            there&apos;s no built-in partitioning to reach for.
          </>
        ),
      },
    };
  }
  return {
    rabbit: 1,
    kafka: 0,
    reason: {
      broker: "rabbitmq",
      text: (
        <>
          Moderate volume doesn&apos;t need a partitioned log to keep up. A single
          well-configured RabbitMQ <T id="queue">queue</T> (or a handful, sharded manually)
          handles this comfortably, with a much simpler operational footprint than running a
          Kafka cluster.
        </>
      ),
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
        text: (
          <>
            You need ordering per key (e.g. per customer, per order). Kafka guarantees order
            within a <T id="partition">partition</T>, and the default partitioner sends every
            message with the same key to the same partition — per-key order falls out for free.
          </>
        ),
      },
    };
  }
  if (v === "strict") {
    return {
      rabbit: 0.5,
      kafka: 1,
      reason: {
        broker: "kafka",
        text: (
          <>
            Strict, global ordering is expensive in both systems — it means giving up
            parallelism. Kafka gets you there cheaply only by using a single{" "}
            <T id="partition">partition</T>; RabbitMQ gets you there only with a single{" "}
            <T id="queue">queue</T> and a single consumer. Neither one makes &ldquo;everything in
            exact order, fully parallel&rdquo; possible — that combination doesn&apos;t exist.
          </>
        ),
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
        text: (
          <>
            Several independent systems each need the full stream. Kafka{" "}
            <T id="consumer-group">consumer groups</T> track their own <T id="offset">offset</T>{" "}
            independently — ten teams can each read the same topic at their own pace with zero
            coordination. In RabbitMQ, each independent consumer needs its own{" "}
            <T id="queue">queue</T> bound to the <T id="exchange">exchange</T>, which means its
            own copy of every message from the moment it&apos;s created.
          </>
        ),
      },
    };
  }
  return {
    rabbit: 2,
    kafka: 0,
    reason: {
      broker: "rabbitmq",
      text: (
        <>
          This is a worker pool pulling discrete jobs off one backlog. RabbitMQ&apos;s{" "}
          <T id="competing-consumers">competing-consumer</T> queue — per-message{" "}
          <T id="ack">ack</T>, <T id="prefetch">prefetch</T> limits, priority queues — is
          purpose-built for exactly this. Kafka caps your parallelism at the{" "}
          <T id="partition">partition</T> count and only gives you offset commits, not a
          per-message ack.
        </>
      ),
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
        text: (
          <>
            You need this data to stick around as a system of record, not just until it&apos;s
            processed. That&apos;s Kafka&apos;s default posture — a <T id="topic">topic</T> is a
            durable, replicated <T id="log">log</T> with a <T id="retention">retention</T> policy
            you control, not a transient handoff.
          </>
        ),
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
  const scored: { id: string; score: TraitScore }[] = [
    { id: "replay", score: scoreReplay(req.replay) },
    { id: "routing", score: scoreRouting(req.routing) },
    { id: "throughput", score: scoreThroughput(req.throughput) },
    { id: "ordering", score: scoreOrdering(req.ordering) },
    { id: "consumers", score: scoreConsumers(req.consumers) },
    { id: "retention", score: scoreRetention(req.retention) },
  ];

  const rabbitScore = scored.reduce((sum, s) => sum + s.score.rabbit, 0);
  const kafkaScore = scored.reduce((sum, s) => sum + s.score.kafka, 0);
  const reasons: TraitReason[] = scored
    .filter((s): s is { id: string; score: TraitScore & { reason: Omit<TraitReason, "id"> } } => s.score.reason !== undefined)
    .map((s) => ({ id: s.id, ...s.score.reason }));

  const diff = kafkaScore - rabbitScore;
  const leader = Math.abs(diff) < 1 ? "either" : diff > 0 ? "kafka" : "rabbitmq";

  return { leader, rabbitScore, kafkaScore, reasons };
}
