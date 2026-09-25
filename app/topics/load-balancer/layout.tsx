import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { TopicTabs } from "@/components/topic/topic-tabs";
import { topicJsonLd } from "@/lib/seo";

const TABS = [
  { href: "/topics/load-balancer", label: "Simulate" },
  { href: "/topics/load-balancer/study", label: "Study" },
  { href: "/topics/load-balancer/glossary", label: "Glossary" },
];

export default function LoadBalancerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <JsonLd data={topicJsonLd("load-balancer")} />
      <p className="text-xs font-medium text-text-faint">topics / traffic-routing</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">Load Balancer</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Round robin, least connections, weighted and IP-hash routing across a pool of
        backends. Break one on purpose and watch the routing decision change.
      </p>

      <div className="mt-6">
        <TopicTabs tabs={TABS} />
      </div>

      <div className="mt-6">{children}</div>
    </Container>
  );
}
