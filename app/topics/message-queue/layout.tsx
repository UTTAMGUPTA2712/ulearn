import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { TopicTabs } from "@/components/topic/topic-tabs";

export const metadata: Metadata = {
  title: "Message Queue",
};

const TABS = [
  { href: "/topics/message-queue", label: "Simulate" },
  { href: "/topics/message-queue/study", label: "Study" },
];

export default function MessageQueueLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <p className="text-xs font-medium text-text-faint">topics / async-messaging</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">Message Queue</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        A generic event-driven pipeline, not one broker&apos;s API — a bounded backlog, competing
        or fanned-out consumers, and what actually happens when one crashes mid-job or the
        producer outruns them. Switch delivery modes, kill a consumer, and watch redelivery,
        retries and the dead-letter queue do their jobs.
      </p>

      <div className="mt-6">
        <TopicTabs tabs={TABS} />
      </div>

      <div className="mt-6">{children}</div>
    </Container>
  );
}
