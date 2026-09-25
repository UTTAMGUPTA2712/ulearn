import type { Metadata } from "next";

import { topicMetadata } from "@/lib/seo";

import { RateLimiterSimulation } from "./_components/simulation";

export const metadata: Metadata = topicMetadata("rate-limiter", "simulate");

export default function RateLimiterPage() {
  return <RateLimiterSimulation />;
}
