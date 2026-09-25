import type { Metadata } from "next";

import { topicMetadata } from "@/lib/seo";

import { LoadBalancerSimulation } from "./_components/simulation";

export const metadata: Metadata = topicMetadata("load-balancer", "simulate");

export default function LoadBalancerPage() {
  return <LoadBalancerSimulation />;
}
