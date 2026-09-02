import type { GlossaryEntry } from "@/components/study/term";

/**
 * Single source of truth for every RabbitMQ/Kafka term used across this
 * topic's Simulate, Match and Study pages. The `/glossary` tab renders this
 * whole list; every inline `<Term>` popover elsewhere looks a definition up
 * from this same array — nothing is ever defined twice.
 */
export const GLOSSARY: GlossaryEntry[] = [
  // --- RabbitMQ ---
  {
    id: "exchange",
    term: "Exchange",
    definition:
      "Where a RabbitMQ producer actually publishes to — never straight to a queue. Its type (direct, topic, fanout, headers) decides how it matches messages to the queues bound to it. This is where RabbitMQ's routing intelligence lives.",
  },
  {
    id: "binding",
    term: "Binding",
    definition:
      "The link between an exchange and a queue, optionally filtered by a routing-key pattern (e.g. orders.eu.*). A message can fan out to several queues if several bindings match it.",
  },
  {
    id: "queue",
    term: "Queue",
    definition:
      "A durable, ordered backlog of messages in RabbitMQ. A message sits here until a consumer pulls and acks it, at which point it's deleted — a classic or quorum queue doesn't keep it around afterward.",
  },
  {
    id: "ack",
    term: "Ack (acknowledgment)",
    definition:
      "A consumer's explicit signal to RabbitMQ that it's actually finished processing a message — not just received it. Once every queue a message was routed to has acked it, the broker deletes it for good.",
  },
  {
    id: "prefetch",
    term: "Prefetch",
    definition:
      "A cap on how many unacked messages one RabbitMQ consumer can hold at once, so one slow worker can't hoard the whole backlog while other workers sit idle.",
  },
  {
    id: "competing-consumers",
    term: "Competing consumers",
    definition:
      "A pool of workers pulling discrete jobs off one shared backlog, where each job is handled by exactly one worker. RabbitMQ's queue model — per-message ack, prefetch, redelivery on crash — is purpose-built for this pattern.",
  },

  // --- Kafka ---
  {
    id: "topic",
    term: "Topic",
    definition:
      "A named stream in Kafka, split into partitions for horizontal scale. Producers publish to a topic; consumer groups read from it independently, each at their own pace.",
  },
  {
    id: "partition",
    term: "Partition",
    definition:
      "One ordered, append-only slice of a Kafka topic, replicated across brokers for durability. Order is only guaranteed within a single partition, never across a whole topic.",
  },
  {
    id: "partition-key",
    term: "Partition key",
    definition:
      "The value (often a user id or order id) Kafka hashes to pick which partition a message lands on. Same key, same partition, every time — which is what makes 'ordered per key' free instead of something you build.",
  },
  {
    id: "log",
    term: "Log",
    definition:
      "Kafka's core structure — an append-only sequence of messages, written once and never edited. Consumers read it by position rather than by removing entries, which is exactly why the same message can be read by many independent readers.",
  },
  {
    id: "offset",
    term: "Offset",
    definition:
      "The position of the next message a Kafka consumer group will read in a partition — its bookmark in the log. Replay is just resetting this number backward; it's tracked per group, independently of every other group reading the same topic.",
  },
  {
    id: "consumer-group",
    term: "Consumer group",
    definition:
      "A set of Kafka consumers that split a topic's partitions between them — each partition goes to exactly one consumer in the group at a time. Two different groups reading the same topic never affect each other's offset.",
  },
  {
    id: "retention",
    term: "Retention",
    definition:
      "How long Kafka keeps a message in the log — a time window, a size cap, or forever for a compacted topic — regardless of whether anyone's read it yet.",
  },
  {
    id: "eviction",
    term: "Eviction",
    definition:
      "A Kafka log entry aging out once it exceeds the topic's retention window — deleted whether or not any consumer group ever read it. A group sitting on an offset that falls outside the window gets snapped forward to the oldest entry still available.",
  },
  {
    id: "replay",
    term: "Replay",
    definition:
      "Reprocessing messages a consumer already read once, by resetting a Kafka consumer group's offset backward. There's no equivalent in a default RabbitMQ queue — once a message is acked, it's gone for good.",
  },
  {
    id: "poll-rate",
    term: "Poll rate",
    definition:
      "How often, per second, a Kafka consumer group pulls the next message off its partition. Unlike RabbitMQ, nothing is pushed to it — a slow poll rate just means the group falls further behind the live edge, not that messages back up waiting for it.",
  },

  // --- Shared ---
  {
    id: "fanout",
    term: "Fan-out",
    definition:
      "Delivering the same message to every interested consumer, not just one. In RabbitMQ this is a fanout exchange bound to several queues (one full copy of the stream each); in Kafka it's several independent consumer groups reading the same log.",
  },
];
