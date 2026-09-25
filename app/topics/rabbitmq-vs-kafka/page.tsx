import type { Metadata } from "next";

import { topicMetadata } from "@/lib/seo";

import { Mechanics } from "./_components/mechanics";

export const metadata: Metadata = topicMetadata("rabbitmq-vs-kafka", "simulate");

export default function RabbitMqVsKafkaPage() {
  return <Mechanics />;
}
