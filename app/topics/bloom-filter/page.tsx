import type { Metadata } from "next";

import { topicMetadata } from "@/lib/seo";

import { BloomSimulation } from "./_components/simulation";

export const metadata: Metadata = topicMetadata("bloom-filter", "simulate");

export default function BloomFilterPage() {
  return <BloomSimulation />;
}
