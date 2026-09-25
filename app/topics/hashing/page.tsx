import type { Metadata } from "next";

import { topicMetadata } from "@/lib/seo";

import { HashingSimulation } from "./_components/simulation";

export const metadata: Metadata = topicMetadata("hashing", "simulate");

export default function HashingPage() {
  return <HashingSimulation />;
}
