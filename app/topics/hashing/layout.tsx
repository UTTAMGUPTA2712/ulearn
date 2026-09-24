import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { TopicTabs } from "@/components/topic/topic-tabs";

export const metadata: Metadata = {
  title: "Hashing & Collisions",
};

const TABS = [
  { href: "/topics/hashing", label: "Simulate" },
  { href: "/topics/hashing/study", label: "Study" },
  { href: "/topics/hashing/glossary", label: "Glossary" },
];

export default function HashingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <p className="text-xs font-medium text-text-faint">topics / data-caching</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">Hashing &amp; Collisions</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        A hash function turns a key into a bucket number, so you can jump straight to it instead of
        searching. Pile keys into a table, watch them collide, then break the hash on purpose.
      </p>

      <div className="mt-6">
        <TopicTabs tabs={TABS} />
      </div>

      <div className="mt-6">{children}</div>
    </Container>
  );
}
