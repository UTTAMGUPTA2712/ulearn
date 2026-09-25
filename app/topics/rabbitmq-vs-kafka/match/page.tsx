import type { Metadata } from "next";

import { topicMetadata } from "@/lib/seo";

import { BrokerMatcher } from "../_components/matcher";

export const metadata: Metadata = topicMetadata("rabbitmq-vs-kafka", "match");

export default function RabbitMqVsKafkaMatchPage() {
  return <BrokerMatcher />;
}
