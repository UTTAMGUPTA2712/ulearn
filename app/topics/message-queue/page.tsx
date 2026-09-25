import type { Metadata } from "next";

import { topicMetadata } from "@/lib/seo";

import { MessageQueueSimulation } from "./_components/simulation";

export const metadata: Metadata = topicMetadata("message-queue", "simulate");

export default function MessageQueuePage() {
  return <MessageQueueSimulation />;
}
