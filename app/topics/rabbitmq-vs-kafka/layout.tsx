import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { TopicTabs } from "@/components/topic/topic-tabs";

export const metadata: Metadata = {
  title: "RabbitMQ vs Kafka",
};

const TABS = [
  { href: "/topics/rabbitmq-vs-kafka", label: "Simulate" },
  { href: "/topics/rabbitmq-vs-kafka/match", label: "Match" },
  { href: "/topics/rabbitmq-vs-kafka/study", label: "Study" },
];

export default function RabbitMqVsKafkaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <p className="text-xs font-medium text-text-faint">topics / async-messaging</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">RabbitMQ vs Kafka</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Smart broker vs. dumb log — not a benchmark, a difference in what each one actually does
        at runtime. Watch the same published event get pushed to a worker and deleted on ack on
        one side, while it sits in a log getting pulled by independent consumer groups on the
        other. Then use Match to score a workload&apos;s traits, or Study for the full
        scenario-by-scenario reasoning.
      </p>

      <div className="mt-6">
        <TopicTabs tabs={TABS} />
      </div>

      <div className="mt-6">{children}</div>
    </Container>
  );
}
