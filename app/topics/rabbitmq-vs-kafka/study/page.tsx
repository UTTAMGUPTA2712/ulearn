import type { Metadata } from "next";

import { ComparisonTable } from "@/components/study/comparison-table";
import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";
import { TableOfContents } from "@/components/study/table-of-contents";

import { SCENARIOS } from "../_lib/scenarios";
import { ScenarioCard } from "../_components/scenario-card";

export const metadata: Metadata = {
  title: "RabbitMQ vs Kafka · Study",
};

const SECTIONS = [
  "Two different ideas of what a broker is",
  "RabbitMQ's building blocks",
  "Kafka's building blocks",
  "Six questions that actually decide it",
  "Side-by-side",
  "Scenario playbook",
];

export default function RabbitMqVsKafkaStudyPage() {
  return (
    <div className="mx-auto flex max-w-[67rem] gap-12">
      <div className="min-w-0 max-w-3xl flex-1 space-y-8">
        <Section title="Two different ideas of what a broker is">
          <p>
            RabbitMQ and Kafka both move messages from producers to consumers, both scale
            horizontally, and both show up on the same &ldquo;message queue&rdquo; shortlist —
            which makes it easy to treat them as interchangeable and pick whichever one a
            teammate already knows. They&apos;re not interchangeable. They&apos;re built on two
            genuinely different mental models, and most of the &ldquo;which one should we
            use&rdquo; friction people hit in production traces back to picking one and
            expecting the other one&apos;s behavior.
          </p>
          <p>
            <strong>RabbitMQ is a smart broker.</strong> A message arrives at an{" "}
            <em>exchange</em>, and the broker itself decides — based on routing rules you
            configured — which queue(s), if any, it goes to. The broker is doing real work:
            evaluating bindings, applying routing keys, tracking per-message acknowledgment,
            deciding when to redeliver. Once a message is acked by every queue it was routed to,
            it&apos;s gone. RabbitMQ implements AMQP 0-9-1, the same protocol whether you&apos;re
            running one queue or a cluster of them.
          </p>
          <p>
            <strong>Kafka is a dumb, fast log.</strong> A message is appended to a{" "}
            <em>partition</em> — an ordered, append-only file, replicated across brokers — and it
            just sits there until its retention window expires, whether or not anyone&apos;s read
            it. Kafka does almost no per-message work: no routing decisions, no per-message ack.
            Consumers do the work instead, tracking their own position (an <em>offset</em>) in
            the log and moving it forward as they read. &ldquo;Dumb&rdquo; here is a compliment,
            not a knock — offloading intelligence out of the broker and into consumers is exactly
            what lets a Kafka cluster push far more raw throughput than a broker that has to make
            a routing decision on every single message.
          </p>
          <p>
            Everything else in this page — retention, ordering, routing, ecosystem, ops
            complexity — is a direct consequence of that one architectural choice. Learn that
            choice and the rest stops being a list of trivia to memorize.
          </p>
        </Section>

        <Section title="RabbitMQ's building blocks">
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Exchange">
              Where a producer actually publishes to — never straight to a queue. An exchange has
              a type (<code>direct</code>, <code>topic</code>, <code>fanout</code>,{" "}
              <code>headers</code>) that decides how it matches messages to bindings. This is
              where RabbitMQ&apos;s routing intelligence lives.
            </ConceptCard>
            <ConceptCard name="Queue &amp; binding">
              A queue is a durable, ordered backlog; a binding connects an exchange to a queue,
              optionally with a routing-key pattern (<code>orders.eu.*</code>). A message can fan
              out to several queues if several bindings match it.
            </ConceptCard>
            <ConceptCard name="Ack &amp; prefetch">
              A consumer explicitly acks a message once it&apos;s actually done processing it —
              not just received it. An unacked message whose consumer dies gets redelivered.{" "}
              <em>Prefetch</em> caps how many unacked messages one consumer can hold at once, so
              one slow worker can&apos;t hoard the whole backlog.
            </ConceptCard>
            <ConceptCard name="Once it&apos;s acked, it&apos;s gone">
              A classic or quorum queue deletes a message the moment every bound queue has acked
              it. There&apos;s no built-in replay. (RabbitMQ&apos;s newer <em>streams</em> feature
              is a log-like queue type that can replay — but that&apos;s an opt-in exception, not
              how a default queue behaves.)
            </ConceptCard>
          </div>
        </Section>

        <Section title="Kafka's building blocks">
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Topic &amp; partition">
              A topic is a named stream, split into partitions for horizontal scale. Each
              partition is its own ordered, append-only log, replicated across brokers for
              durability. Order is only guaranteed <em>within</em> a partition, never across the
              whole topic.
            </ConceptCard>
            <ConceptCard name="Partition key">
              A producer picks a partition per message — usually by hashing a key (a user id, an
              order id). Same key, same partition, every time, which is what makes
              &ldquo;ordered per key&rdquo; a free property rather than something you build.
            </ConceptCard>
            <ConceptCard name="Consumer group &amp; offset">
              Consumers in the same group split a topic&apos;s partitions between them — each
              partition goes to exactly one consumer in the group at a time, capping useful
              parallelism at the partition count. Each group tracks its own <em>offset</em> per
              partition, independently of every other group reading the same topic.
            </ConceptCard>
            <ConceptCard name="Retention">
              A message stays for a configured window (time or size based, or forever for a
              compacted topic keyed by id) regardless of whether it&apos;s been consumed. Replay
              is just resetting a consumer group&apos;s offset backward — no special feature
              required.
            </ConceptCard>
          </div>
        </Section>

        <Section title="Six questions that actually decide it">
          <p>
            Skip the reputations (&ldquo;Kafka is the scalable one,&rdquo; &ldquo;RabbitMQ is the
            simple one&rdquo;) and ask what the workload actually needs. These are the six traits
            the matcher on this topic&apos;s <em>Match</em> tab scores — walk through them for
            your own system before reaching for either one.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong className="text-text">Will a consumer ever need to replay history?</strong>{" "}
              If yes, you need a durable log with retention independent of consumption — that&apos;s
              Kafka&apos;s default behavior, not RabbitMQ&apos;s.
            </li>
            <li>
              <strong className="text-text">Does routing depend on message content?</strong> If a
              message&apos;s destination depends on more than a partition key — tenant, region,
              event subtype — RabbitMQ&apos;s exchanges express that declaratively. Kafka makes
              every consumer read everything and filter.
            </li>
            <li>
              <strong className="text-text">What&apos;s the actual volume?</strong> A single well-run
              RabbitMQ queue (or a few, sharded by hand) is genuinely fine for moderate traffic.
              Reach for a partitioned log when one queue would become the bottleneck, not by
              default.
            </li>
            <li>
              <strong className="text-text">What ordering do you actually need?</strong>{" "}
              &ldquo;None&rdquo; is neutral. &ldquo;Per key&rdquo; favors Kafka — it falls out of
              partitioning for free. &ldquo;Strict and global&rdquo; is expensive in{" "}
              <em>both</em>: one partition, or one queue with one consumer. Neither gives you
              strict order and full parallelism at once.
            </li>
            <li>
              <strong className="text-text">Who&apos;s consuming — one pool, or several
              independent systems?</strong> A worker pool sharing one backlog is RabbitMQ&apos;s
              competing-consumers pattern. Several independent systems each needing the full
              stream, at their own pace, is what consumer groups are for.
            </li>
            <li>
              <strong className="text-text">Once it&apos;s processed, is the data done, or is it
              a system of record?</strong> If the data needs to outlive being read — for audit,
              reprocessing, or because the log <em>is</em> the source of truth — that&apos;s
              Kafka&apos;s job description, not a queue&apos;s.
            </li>
          </ol>
        </Section>

        <Section title="Side-by-side">
          <ComparisonTable
            columns={["RabbitMQ", "Kafka"]}
            rows={[
              { label: "Core model", values: ["Smart broker — exchanges route, queues hold", "Dumb log — partitioned, replicated, append-only"] },
              { label: "Delivery unit", values: ["Message, explicitly acked", "Log entry, offset committed"] },
              { label: "After it's consumed", values: ["Deleted once acked (streams excepted)", "Kept until retention expires, regardless"] },
              { label: "Replay", values: ["Not by default", "Reset a consumer group's offset"] },
              { label: "Ordering", values: ["Per queue, best-effort under concurrency", "Strict within a partition, by key"] },
              { label: "Routing logic", values: ["Exchanges: direct/topic/fanout/headers", "Partition key only — filter client-side otherwise"] },
              { label: "Multiple independent consumers", values: ["One queue (one full copy) per consumer", "One consumer group per consumer, same log"] },
              { label: "Parallelism ceiling", values: ["Add queues/consumers freely", "Capped by partition count per group"] },
              { label: "Typical scale", values: ["Tens of thousands of msg/s per queue", "Millions of msg/s across a partitioned cluster"] },
              { label: "Request/reply", values: ["Native pattern (reply-to + correlation id)", "Not a primitive — build it on two topics"] },
              { label: "Stream processing ecosystem", values: ["Plugin-based, narrower", "Kafka Streams, ksqlDB, Connect, wide ecosystem"] },
              { label: "Operational footprint", values: ["Simpler at moderate scale", "Heavier — partitions, replicas, retention tuning"] },
            ]}
          />
        </Section>

        <Section title="Scenario playbook">
          <p>
            Nine concrete workloads, each with the mechanism-level reason one architecture fits
            and the specific friction you&apos;d hit picking the other — including one
            deliberate toss-up, because not every decision should resolve to a clean winner.
            Open the <em>Match</em> tab and click any of these to load its exact traits into the
            live scoring model.
          </p>
          <div className="space-y-4">
            {SCENARIOS.map((s) => (
              <ScenarioCard key={s.slug} scenario={s} />
            ))}
          </div>
        </Section>
      </div>

      <TableOfContents sections={SECTIONS} />
    </div>
  );
}
