import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { TopicTabs } from "@/components/topic/topic-tabs";

export const metadata: Metadata = {
  title: "RabbitMQ vs Kafka",
};

const TABS = [
  { href: "/topics/rabbitmq-vs-kafka", label: "Match" },
  { href: "/topics/rabbitmq-vs-kafka/study", label: "Study" },
];

export default function RabbitMqVsKafkaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <p className="text-xs font-medium text-text-faint">topics / async-messaging</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">RabbitMQ vs Kafka</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Smart broker vs. dumb log — not a benchmark, a difference in what each one is actually
        for. Describe a workload&apos;s six traits below and watch which architecture the
        reasoning favors, or load a real scenario and see the same call made in detail on the
        Study tab.
      </p>

      <div className="mt-6">
        <TopicTabs tabs={TABS} />
      </div>

      <div className="mt-6">{children}</div>
    </Container>
  );
}
