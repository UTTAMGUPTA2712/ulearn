import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { TopicTabs } from "@/components/topic/topic-tabs";
import { topicJsonLd } from "@/lib/seo";

const TABS = [
  { href: "/topics/bloom-filter", label: "Simulate" },
  { href: "/topics/bloom-filter/study", label: "Study" },
  { href: "/topics/bloom-filter/glossary", label: "Glossary" },
];

export default function BloomFilterLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <JsonLd data={topicJsonLd("bloom-filter")} />
      <p className="text-xs font-medium text-text-faint">topics / data-caching</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">Bloom Filter</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        A HashSet of every key won&apos;t fit in RAM, and asking the disk costs a seek every time, even for keys
        that aren&apos;t there. A Bloom filter answers &ldquo;definitely not&rdquo; from a few bits of memory, so
        the disk only hears about keys that might exist.
      </p>

      <div className="mt-6">
        <TopicTabs tabs={TABS} />
      </div>

      <div className="mt-6">{children}</div>
    </Container>
  );
}
