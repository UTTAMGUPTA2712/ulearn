import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { TopicTabs } from "@/components/topic/topic-tabs";

export const metadata: Metadata = {
  title: "Concurrency vs Parallelism",
};

const TABS = [
  { href: "/topics/concurrency-vs-parallelism", label: "Simulate" },
  { href: "/topics/concurrency-vs-parallelism/study", label: "Study" },
];

export default function ConcurrencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <p className="text-xs font-medium text-text-faint">topics / compute-concurrency</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">
        Concurrency vs Parallelism vs Multithreading vs Multiprocessing
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Dealing with a lot of things at once, versus doing a lot of things at once — and the two ways to build
        either one.
      </p>

      <div className="mt-6">
        <TopicTabs tabs={TABS} />
      </div>

      <div className="mt-6">{children}</div>
    </Container>
  );
}
