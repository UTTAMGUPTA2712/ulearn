import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { TopicTabs } from "@/components/topic/topic-tabs";
import { topicJsonLd } from "@/lib/seo";

const TABS = [
  { href: "/topics/consistent-hashing", label: "Simulate" },
  { href: "/topics/consistent-hashing/study", label: "Study" },
  { href: "/topics/consistent-hashing/glossary", label: "Glossary" },
];

export default function ConsistentHashingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <JsonLd data={topicJsonLd("consistent-hashing")} />
      <p className="text-xs font-medium text-text-faint">topics / data-caching</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">Consistent Hashing</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Spread a cache over N servers with hash(key) % N and it works, until N changes. Kill one node and watch
        nearly every key move, then do the same on a hash ring and watch only the dead node&apos;s keys go.
      </p>

      <div className="mt-6">
        <TopicTabs tabs={TABS} />
      </div>

      <div className="mt-6">{children}</div>
    </Container>
  );
}
