import type { Metadata } from "next";

import { topicMetadata } from "@/lib/seo";

import { ConsistentHashingSimulation } from "./_components/simulation";

export const metadata: Metadata = topicMetadata("consistent-hashing", "simulate");

export default function ConsistentHashingPage() {
  return <ConsistentHashingSimulation />;
}
