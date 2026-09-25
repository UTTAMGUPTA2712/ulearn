import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { TopicTabs } from "@/components/topic/topic-tabs";
import { topicJsonLd } from "@/lib/seo";

const TABS = [
  { href: "/topics/rate-limiter", label: "Simulate" },
  { href: "/topics/rate-limiter/study", label: "Study" },
  { href: "/topics/rate-limiter/glossary", label: "Glossary" },
];

export default function RateLimiterLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <JsonLd data={topicJsonLd("rate-limiter")} />
      <p className="text-xs font-medium text-text-faint">topics / traffic-routing</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">Rate Limiter</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Fixed window, sliding window, token bucket and leaky bucket throttling, keyed per
        client. Hammer one caller to see it kick in — then flood from thousands of spoofed
        IPs to see where per-client limiting alone stops helping.
      </p>

      <div className="mt-6">
        <TopicTabs tabs={TABS} />
      </div>

      <div className="mt-6">{children}</div>
    </Container>
  );
}
