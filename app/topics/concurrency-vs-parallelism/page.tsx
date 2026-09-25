import type { Metadata } from "next";

import { topicMetadata } from "@/lib/seo";

import { ConcurrencySimulation } from "./_components/simulation";

export const metadata: Metadata = topicMetadata("concurrency-vs-parallelism", "simulate");

export default function ConcurrencyPage() {
  return <ConcurrencySimulation />;
}
