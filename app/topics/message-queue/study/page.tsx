import type { Metadata } from "next";

import { ComparisonTable } from "@/components/study/comparison-table";
import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";
import { TableOfContents } from "@/components/study/table-of-contents";
import { topicMetadata } from "@/lib/seo";

export const metadata: Metadata = topicMetadata("message-queue", "study");

const SECTIONS = [
  "What a message queue actually buys you",
  "Two generic delivery shapes",
  "Backpressure: what happens when the producer wins",
  "Acknowledgment, visibility timeout, and redelivery",
  "Retries and the dead-letter queue",
];

export default function MessageQueueStudyPage() {
  return (
    <div className="mx-auto flex max-w-[67rem] gap-12">
      <div className="min-w-0 max-w-3xl flex-1 space-y-8">
        <Section title="What a message queue actually buys you">
          <p>
            A message queue sits between something that produces work (an API handler, a
            cron job, another service) and something that does the work, and it decouples
            the two in time. The producer doesn&apos;t call the consumer directly and wait
            for a response — it drops a message and moves on, trusting the broker to hold
            it until a consumer is free. That single property is where every benefit comes
            from: the producer never blocks on a slow consumer, a consumer can crash and
            restart without the producer noticing, and you can scale the two sides
            independently instead of matching one API call to one unit of downstream work.
          </p>
          <p>
            &ldquo;Event-driven architecture&rdquo; is the same idea at a larger scale —
            services publish events (&ldquo;order placed,&rdquo; &ldquo;payment failed&rdquo;)
            instead of calling each other directly, and whoever cares about an event
            subscribes to it. A message queue is the mechanism that makes that decoupling
            actually work under load, which is what this simulation focuses on rather than
            any one product&apos;s API.
          </p>
        </Section>

        <Section title="Two generic delivery shapes">
          <p>
            Almost every broker you&apos;ll encounter — SQS, RabbitMQ, Kafka, Redis Streams —
            is really offering some mix of two underlying shapes. The simulator lets you
            switch between them directly rather than picking a product, because the
            difference is the thing worth understanding.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Work queue (competing consumers)">
              One shared backlog. Every message is delivered to exactly one consumer —
              whichever one is free first — so adding consumers spreads the same work
              across more workers. This is the shape behind a job queue: resize images,
              send emails, process a payment. Each unit of work happens once, by one worker.
            </ConceptCard>
            <ConceptCard name="Fan-out (pub/sub)">
              Every consumer gets its own copy of every message, and keeps its own backlog
              if it falls behind. This is the shape behind events: &ldquo;order
              placed&rdquo; might need to trigger an email, update analytics, and adjust
              inventory — three independent consumers, each seeing every event, each
              coping with load on its own.
            </ConceptCard>
          </div>
          <p>
            Try it: switch to fan-out, add a couple of consumers, and publish a burst.
            Watch the same message travel to every consumer at once, and notice each
            consumer&apos;s own backlog count on its card — a slow consumer accumulates a
            backlog that has nothing to do with how the others are doing, because they
            aren&apos;t sharing one queue anymore.
          </p>
        </Section>

        <Section title="Backpressure: what happens when the producer wins">
          <p>
            A backlog has a capacity for a reason — an unbounded queue just moves the
            memory problem from the consumer to the broker. Once it&apos;s full, something
            has to give, and the simulator&apos;s two backpressure policies are the two
            real answers:
          </p>
          <p>
            <strong>Drop</strong> rejects new messages outright once the backlog is full —
            simple, and it protects the broker, but it silently loses work unless the
            producer is built to retry or the loss is acceptable (metrics, best-effort
            logs). <strong>Pause the producer</strong> instead makes the publish call
            itself block until there&apos;s room — nothing is lost, but now a slow consumer
            can stall the producer, which can cascade upstream if that producer is, say, a
            request handler with its own caller waiting.
          </p>
          <p>
            Turn the processing time up, start auto-publish at a high rate, and watch the
            backlog fill toward capacity under either policy — then use <strong>Add
            consumer</strong> to scale the work side and watch it drain. That scaling
            response is the entire pitch for decoupling producer from consumer in the
            first place: the fix for a growing backlog is more workers, not a faster
            producer.
          </p>
        </Section>

        <Section title="Acknowledgment, visibility timeout, and redelivery">
          <p>
            A consumer doesn&apos;t just read a message — it has to tell the broker it
            actually finished the work (an <em>ack</em>) before the broker considers the
            message done. That handoff is what makes a consumer crash survivable instead
            of catastrophic: if a worker dies mid-job, it never acks, and the broker
            eventually notices and hands the message to someone else.
          </p>
          <p>
            &ldquo;Eventually notices&rdquo; is the <strong>visibility timeout</strong>: the
            moment a message is handed to a consumer, the broker hides it from everyone
            else for that long, betting that the consumer will finish and ack before it
            expires. Hit <strong>Kill</strong> on a busy consumer and watch its message go
            quiet — the broker has no idea anything went wrong yet — until the timeout
            expires and it&apos;s redelivered to another consumer. Set the timeout too
            short and you get duplicate processing (the original consumer was still
            working, just slow); set it too long and a genuine crash sits unnoticed for a
            while. There&apos;s no value that&apos;s simply correct — it&apos;s a bet on how
            long real work should ever take.
          </p>
          <p>
            Notice, too, that the killed consumer itself restarts on its own a few seconds
            later, empty and ready for new work — that recovery is independent of the
            message&apos;s own timeout. A supervisor (Kubernetes, ECS, a process manager)
            restarting a dead worker and a broker redelivering an unacked message are two
            separate mechanisms solving two separate problems, running on their own clocks.
          </p>
        </Section>

        <Section title="Retries and the dead-letter queue">
          <p>
            Redelivery assumes the failure was transient — a dead process, a network blip —
            and that trying again will work. Sometimes it won&apos;t: a message with a bug
            in it, or pointed at a resource that&apos;s permanently gone, will fail the same
            way every single time, and blind retries just burn consumer capacity forever
            without ever finishing. That&apos;s what <strong>max retries</strong> and the
            <strong> dead-letter queue</strong> are for — after a message fails (or crashes
            its consumer) that many times, it stops being retried and moves to a separate
            queue for a human, or a different process, to look at later.
          </p>
          <p>
            The simulator&apos;s <strong>job failure rate</strong> models the other failure
            path: a consumer that runs to completion but the work itself throws (a bad
            record, a downstream 500) — an explicit nack, no crash and no visibility
            timeout involved, just an immediate retry-or-dead-letter decision. Turn it up
            and watch messages cycle through the backlog a few times, going amber each
            retry, before landing in the dead-letter queue. In a real system, that queue is
            the thing you monitor — a dead-letter count that&apos;s climbing means something
            is wrong in a way retries can&apos;t fix.
          </p>
        </Section>

        <ComparisonTable
          columns={["Work queue", "Fan-out (pub/sub)"]}
          rows={[
            { label: "Who gets each message", values: ["Exactly one consumer", "Every consumer, independently"] },
            { label: "Backlog", values: ["One, shared", "One per consumer"] },
            { label: "Adding a consumer", values: ["Spreads the same work further", "Adds a new, independent subscriber"] },
            { label: "A slow consumer", values: ["Shrinks everyone's throughput — it's one shared line", "Only backs up its own copy of the stream"] },
            { label: "Typical use", values: ["Job queues: emails, image resizing, payments", "Events: order placed, user signed up, price changed"] },
          ]}
        />
      </div>

      <TableOfContents sections={SECTIONS} />
    </div>
  );
}
