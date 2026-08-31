import type { Scenario } from "./types";

/**
 * Curated, mechanism-level scenarios — the detailed "why this one, not that
 * one" content this topic is built around. Shared by two surfaces: the Study
 * page renders every scenario in full, and the hub's matcher offers them as
 * one-click presets (loading a scenario's `requirements` into the toggles so
 * a reader can see the general trait-scoring model agree with the curated
 * answer, or push the toggles further and watch it change).
 *
 * The last scenario is a deliberate "it depends" case — the point of this
 * page is judgment, not a lookup table, and a page that resolves every
 * scenario cleanly would be teaching the wrong lesson.
 */
export const SCENARIOS: Scenario[] = [
  {
    slug: "background-jobs",
    title: "Background job queue",
    shape: "A web app hands off discrete units of work — resize an image, send an email, generate a PDF — to a pool of workers, each job done exactly once.",
    requirements: {
      replay: "none",
      routing: "simple",
      throughput: "moderate",
      ordering: "none",
      consumers: "workers",
      retention: "transient",
    },
    recommendation: "rabbitmq",
    why: "This is the textbook competing-consumers pattern, and RabbitMQ's queue model is built for exactly it: a worker pulls a job, gets a per-message ack once it's actually done, and a prefetch limit stops one greedy worker from hoarding jobs the others could be doing. If a worker crashes mid-job, the unacked message just goes back in the queue for someone else — no extra plumbing required.",
    whyNotOther: "Kafka can technically move the messages, but you'd be rebuilding RabbitMQ's ack/retry/prefetch machinery yourself on top of offset commits, which only tell you \"we're past message N,\" not \"job N actually finished.\" You'd also be capping your worker pool at the partition count for no reason — this workload never needed partitioning in the first place.",
  },
  {
    slug: "rpc-request-reply",
    title: "Synchronous-feeling RPC between two services",
    shape: "Service A publishes a request and needs a specific response back — over a broker instead of a raw HTTP call, so a slow or restarting Service B doesn't take Service A down with it.",
    requirements: {
      replay: "none",
      routing: "simple",
      throughput: "moderate",
      ordering: "none",
      consumers: "workers",
      retention: "transient",
    },
    recommendation: "rabbitmq",
    why: "RabbitMQ has a first-class pattern for this: Service A publishes with a `reply-to` queue and a `correlation-id`, Service B replies onto that queue, and Service A matches the correlation id back to the waiting caller. It's a direct, one-off message with a direct, one-off reply.",
    whyNotOther: "Kafka has no request/reply primitive — you'd fake it with a request topic, a response topic, and your own correlation-id bookkeeping to match replies to callers, on infrastructure whose entire design point is durable streaming, not point-to-point round trips.",
  },
  {
    slug: "multi-tenant-routing",
    title: "Conditional, content-based event routing",
    shape: "An event needs to reach different destinations depending on its own content — which tenant it belongs to, which region, which subtype — not a flat \"give it to everyone\" or \"give it to whoever's free.\"",
    requirements: {
      replay: "none",
      routing: "complex",
      throughput: "moderate",
      ordering: "none",
      consumers: "fanout",
      retention: "transient",
    },
    recommendation: "rabbitmq",
    why: "This is what exchanges and bindings are for. A topic exchange with bindings like `orders.eu.*` and `orders.*.created` lets the broker itself decide where a message goes, based on a routing key — the routing logic lives in configuration, not in every consumer.",
    whyNotOther: "Kafka only routes by partition key. Content-based delivery means every consumer subscribes to the whole topic and filters client-side, or you pre-split the data into many topics up front and hope your routing needs never change shape.",
  },
  {
    slug: "clickstream-analytics",
    title: "High-throughput clickstream / user-event analytics",
    shape: "Millions of small events a day, feeding a real-time dashboard, a data warehouse loader, and an ML feature pipeline — three independent systems, same stream.",
    requirements: {
      replay: "replay",
      routing: "simple",
      throughput: "high",
      ordering: "per-key",
      consumers: "fanout",
      retention: "durable",
    },
    recommendation: "kafka",
    why: "Kafka partitions the topic across brokers to absorb the volume, keys events by user id so each user's events land on the same partition in order, and lets the dashboard, the warehouse loader, and the ML pipeline each run as their own consumer group, reading at their own pace off the same durable log. When the ML pipeline needs to backfill a feature over the last 30 days, that's just resetting its group's offset.",
    whyNotOther: "RabbitMQ would need three separate queues bound to the same exchange — three full copies of a multi-million-event-a-day stream — and none of them could be replayed for a fourth consumer that shows up next quarter. The backfill case alone rules it out.",
  },
  {
    slug: "event-sourcing",
    title: "Event sourcing / CQRS with a full audit trail",
    shape: "The event log itself is the source of truth. Read models (a search index, a reporting table, a cache) are just projections, rebuilt at any time by replaying the log from the start.",
    requirements: {
      replay: "replay",
      routing: "simple",
      throughput: "moderate",
      ordering: "per-key",
      consumers: "fanout",
      retention: "durable",
    },
    recommendation: "kafka",
    why: "Kafka's log is durable by default and doesn't forget a message once it's read — which is the entire premise of event sourcing: the log is the system of record, and every read model is disposable and rebuildable. Partitioning by aggregate id (an order id, an account id) gives strict per-aggregate ordering, which is the one ordering guarantee event sourcing actually needs.",
    whyNotOther: "A RabbitMQ queue deletes a message the instant it's acked. The log can never be the source of truth if it forgets its own history — you'd end up bolting on a separate event store next to RabbitMQ, at which point RabbitMQ is just an unnecessary extra hop in front of the thing that's actually doing the job.",
  },
  {
    slug: "log-aggregation",
    title: "Centralized log / metrics pipeline",
    shape: "Every service ships logs and metrics into one pipeline; alerting, a search index, and a data-lake archive all need the same firehose, independently, and a new sink might get added next month.",
    requirements: {
      replay: "replay",
      routing: "simple",
      throughput: "high",
      ordering: "none",
      consumers: "fanout",
      retention: "durable",
    },
    recommendation: "kafka",
    why: "This is Kafka's original use case at LinkedIn, almost unchanged: a high-volume firehose, several independent sinks (Kafka Connect can push to Elasticsearch, S3, a warehouse) each as their own consumer group, and retention long enough that a sink that falls behind — or a brand new one added later — can catch up from history instead of only from \"now on.\"",
    whyNotOther: "RabbitMQ fan-out means one queue, and one full copy of the firehose, per sink — expensive at this volume — and a sink that's down for an hour doesn't get to catch up on the hour it missed once its queue's retention or capacity limit is hit. There's no underlying log to rewind.",
  },
  {
    slug: "financial-ledger",
    title: "Financial transaction ledger",
    shape: "Every debit and credit for a given account must be applied in exact order, and the full history has to be inspectable and replayable for reconciliation and audits, years later.",
    requirements: {
      replay: "replay",
      routing: "simple",
      throughput: "moderate",
      ordering: "per-key",
      consumers: "fanout",
      retention: "durable",
    },
    recommendation: "kafka",
    why: "Partitioning by account id gives every account's transactions strict, in-order processing without forcing the whole ledger through one queue. Long retention (or a compacted topic keyed by account) means the ledger processor, the audit tooling, and a reconciliation job can each read the same authoritative history independently, at any time.",
    whyNotOther: "RabbitMQ can give you strict order too — but only per queue, which means one queue per account to avoid serializing every account behind every other one, which isn't operationally realistic at any real scale. And once a transaction is acked and gone, there's no durable history left for an audit to replay.",
  },
  {
    slug: "iot-telemetry",
    title: "IoT / sensor telemetry from a large device fleet",
    shape: "Tens of thousands of devices continuously streaming small readings, feeding real-time alerting, long-term storage, and a model-training pipeline.",
    requirements: {
      replay: "replay",
      routing: "simple",
      throughput: "high",
      ordering: "per-key",
      consumers: "fanout",
      retention: "durable",
    },
    recommendation: "kafka",
    why: "The device count alone is a partitioning problem — Kafka scales the topic horizontally across brokers and keys by device id, so each device's readings stay ordered without a single queue having to absorb the entire fleet. Alerting, storage, and model training run as independent consumer groups off the same log.",
    whyNotOther: "A single RabbitMQ queue tops out well below this volume, and scaling it means sharding queues by hand with no built-in mechanism for it. The fan-out-to-three-independent-systems requirement runs into the same full-copy-per-consumer cost as the log-aggregation case above.",
  },
  {
    slug: "realtime-chat-notifications",
    title: "Real-time chat / push notification fan-out",
    shape: "A message posted in a room needs to reach every currently-connected client immediately. Nobody needs yesterday's messages replayed through this pipe — that's what the chat history database is for, not the delivery layer.",
    requirements: {
      replay: "none",
      routing: "simple",
      throughput: "moderate",
      ordering: "none",
      consumers: "fanout",
      retention: "transient",
    },
    recommendation: "either",
    why: "This one is a genuine toss-up, and that's the point: it's simple, low-stakes fan-out with no ordering, no replay and no durability requirement — neither architecture's distinguishing strength is even being tested. RabbitMQ's fanout exchange delivers to every bound queue with almost no configuration. Kafka would work too, at the cost of infrastructure this workload doesn't need.",
    whyNotOther: "The mistake isn't picking either one — it's picking Kafka here out of habit (\"it's the scalable one\") and inheriting operational weight this traffic never asked for, or picking RabbitMQ and assuming it'll be trivial to bolt on replay/analytics later, when that's precisely the thing it doesn't do. Let the actual requirement decide, not the reputation.",
  },
];
