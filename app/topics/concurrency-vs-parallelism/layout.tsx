import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { TopicTabs } from "@/components/topic/topic-tabs";
import { topicJsonLd } from "@/lib/seo";

const TABS = [
  { href: "/topics/concurrency-vs-parallelism", label: "Simulate" },
  { href: "/topics/concurrency-vs-parallelism/study", label: "Study" },
  { href: "/topics/concurrency-vs-parallelism/glossary", label: "Glossary" },
];

export default function ConcurrencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <JsonLd data={topicJsonLd("concurrency-vs-parallelism")} />
      <p className="text-xs font-medium text-text-faint">topics / compute-concurrency</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">Concurrency vs Parallelism</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Concurrency is taking turns so nothing sits idle while it waits; parallelism is more cores working at the
        same instant. Run the same six tasks under each and watch which one actually moves the finish line.
      </p>

      <div className="mt-6">
        <TopicTabs tabs={TABS} />
      </div>

      <div className="mt-6">{children}</div>
    </Container>
  );
}
