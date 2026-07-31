import type { Metadata } from "next";

import { Container } from "@/components/layout/container";

import { TopicTabs } from "./_components/topic-tabs";

export const metadata: Metadata = {
  title: "Load Balancer · ulearn/systems",
};

export default function LoadBalancerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <p className="font-mono text-xs text-text-faint">topics / traffic-routing</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">Load Balancer</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Round robin, least connections, weighted and IP-hash routing across a pool of
        backends. Break one on purpose and watch the routing decision change.
      </p>

      <div className="mt-6">
        <TopicTabs />
      </div>

      <div className="mt-6">{children}</div>
    </Container>
  );
}
