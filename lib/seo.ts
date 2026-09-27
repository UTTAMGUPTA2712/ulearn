import type { Metadata } from "next";

import { topics } from "@/lib/topics";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ulearn-it.vercel.app";
export const SITE_NAME = "ulearn";
export const SITE_TITLE = "ulearn – Interactive System Design Simulations";
export const SITE_DESCRIPTION =
  "ulearn teaches system design with live, interactive simulations — load balancers, rate limiters, message queues, RabbitMQ vs Kafka, hashing and Bloom filters. Watch each mechanism run, tweak it, break it on purpose.";

export type TopicTab = "simulate" | "study" | "glossary" | "match";

type TopicSeo = {
  /** Search-phrased name for the Simulate tab, e.g. "Load Balancer Simulator". */
  simulateTitle: string;
  simulateDescription: string;
  studyTitle: string;
  studyDescription: string;
  /** Concepts the topic teaches — feeds the `LearningResource` JSON-LD. */
  teaches: string[];
};

/**
 * Titles are written for the queries people actually type ("rate limiter
 * token bucket"), not for the in-app tab labels. The root layout's title
 * template appends "| ulearn" to every one of them.
 */
const TOPIC_SEO: Record<string, TopicSeo> = {
  "load-balancer": {
    simulateTitle: "Load Balancer Simulator – Round Robin, Least Connections & IP Hash",
    simulateDescription:
      "Interactive load balancer simulation. Route live traffic with round robin, least connections, weighted, IP-hash, URL-hash and random algorithms, then kill a backend and watch requests get rerouted.",
    studyTitle: "Load Balancing Explained – Algorithms, Failure Modes & Layer 4 vs Layer 7",
    studyDescription:
      "How load balancers work: routing algorithms compared, failure modes and how to handle each, DDoS traffic, and Layer 4 vs Layer 7 load balancing.",
    teaches: ["Load balancing", "Round robin", "Least connections", "Health checks", "Layer 4 vs Layer 7 load balancing"],
  },
  "rate-limiter": {
    simulateTitle: "Rate Limiter Simulator – Token Bucket, Leaky Bucket & Sliding Window",
    simulateDescription:
      "Interactive rate limiter simulation. Compare fixed window, sliding window, token bucket and leaky bucket throttling, hammer one client, then flood from thousands of IPs to see where per-client limits break.",
    studyTitle: "Rate Limiting Explained – Algorithms, Keying & DDoS",
    studyDescription:
      "How rate limiters work: fixed window vs sliding window vs token bucket vs leaky bucket, choosing what counts as one client, and why rate limiting alone doesn't stop a DDoS.",
    teaches: ["Rate limiting", "Token bucket", "Leaky bucket", "Sliding window", "Fixed window"],
  },
  "message-queue": {
    simulateTitle: "Message Queue Simulator – Pub/Sub, Retries & Dead-Letter Queues",
    simulateDescription:
      "Interactive message queue simulation. Switch between work queues and fan-out pub/sub, apply backpressure, kill a consumer mid-job and watch visibility timeouts, retries and the dead-letter queue take over.",
    studyTitle: "Message Queues Explained – Delivery, Backpressure & Acknowledgments",
    studyDescription:
      "How message queues work: work queues vs pub/sub, backpressure policies, acknowledgments, visibility timeouts, retries and dead-letter queues.",
    teaches: ["Message queues", "Publish/subscribe", "Backpressure", "Dead-letter queue", "At-least-once delivery"],
  },
  "rabbitmq-vs-kafka": {
    simulateTitle: "RabbitMQ vs Kafka – Interactive Side-by-Side Simulation",
    simulateDescription:
      "See RabbitMQ and Kafka handle the same events side by side: a smart broker pushing and deleting messages vs a durable log pulled by independent consumer groups.",
    studyTitle: "RabbitMQ vs Kafka Explained – Which One Should You Use?",
    studyDescription:
      "RabbitMQ vs Kafka compared: exchanges and queues vs partitions and offsets, the six questions that actually decide which to use, and a scenario playbook.",
    teaches: ["RabbitMQ", "Apache Kafka", "Message brokers", "Event streaming", "Consumer groups"],
  },
  "concurrency-vs-parallelism": {
    simulateTitle: "Concurrency vs Parallelism – Interactive Visualization",
    simulateDescription:
      "Watch the difference between concurrency and parallelism: run the same tasks sequentially, interleaved and in parallel and see the wall-clock time actually change.",
    studyTitle: "Concurrency vs Parallelism Explained – Threads vs Processes",
    studyDescription:
      "Concurrency vs parallelism, multithreading vs multiprocessing, and threads vs processes — explained with the tradeoffs that matter in practice.",
    teaches: ["Concurrency", "Parallelism", "Multithreading", "Multiprocessing", "Threads vs processes"],
  },
  hashing: {
    simulateTitle: "Hash Table & Collision Simulator – Chaining vs Open Addressing",
    simulateDescription:
      "Interactive hashing simulation. Insert keys into a hash table, switch between chaining and open addressing, then plug in a bad hash function and watch every key collide into one bucket.",
    studyTitle: "Hashing & Collisions Explained – Hash Functions and Hash Tables",
    studyDescription:
      "How hash functions and hash tables work: why collisions are unavoidable, chaining vs open addressing, load factor and resizing, and where hashing shows up in real systems.",
    teaches: ["Hash functions", "Hash tables", "Hash collisions", "Separate chaining", "Open addressing"],
  },
  "bloom-filter": {
    simulateTitle: "Bloom Filter Simulator – False Positives, Bit Arrays & Disk Seeks",
    simulateDescription:
      "Interactive Bloom filter simulation. Insert and check keys, watch absent keys get rejected from RAM before they reach the disk, then saturate the bit array until false positives leak through.",
    studyTitle: "Bloom Filters Explained – False Positive Rate, Sizing & LSM Trees",
    studyDescription:
      "How Bloom filters work: zero false negatives vs acceptable false positives, choosing m and k, why you can't delete, Bloom vs cuckoo vs counting filters, and why every SSTable has one.",
    teaches: ["Bloom filters", "False positive rate", "Probabilistic data structures", "LSM trees", "Counting Bloom filter"],
  },
};

function topicPath(slug: string, tab: TopicTab): string {
  return tab === "simulate" ? `/topics/${slug}` : `/topics/${slug}/${tab}`;
}

function getTopic(slug: string) {
  const topic = topics.find((t) => t.slug === slug);
  const seo = TOPIC_SEO[slug];
  if (!topic || !seo) throw new Error(`No topic/SEO entry for "${slug}"`);
  return { topic, seo };
}

/** Title, description and canonical URL for one tab of a topic. */
export function topicMetadata(slug: string, tab: TopicTab): Metadata {
  const { topic, seo } = getTopic(slug);

  const byTab: Record<TopicTab, { title: string; description: string }> = {
    simulate: { title: seo.simulateTitle, description: seo.simulateDescription },
    study: { title: seo.studyTitle, description: seo.studyDescription },
    glossary: {
      title: `${topic.title} Glossary – Key Terms Defined`,
      description: `Every ${topic.title.toLowerCase()} term defined in plain language — a quick reference for system design interviews and real-world work.`,
    },
    match: {
      title: `${topic.title} – Which One Fits Your Use Case?`,
      description: `Match real-world scenarios to the right tool and see why — an interactive ${topic.title} quiz.`,
    },
  };

  return {
    ...byTab[tab],
    alternates: { canonical: topicPath(slug, tab) },
  };
}

/** Schema.org `LearningResource` for a topic, rendered by its layout. */
export function topicJsonLd(slug: string) {
  const { topic, seo } = getTopic(slug);
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: topic.title,
    headline: seo.simulateTitle,
    description: seo.simulateDescription,
    url: `${SITE_URL}${topicPath(slug, "simulate")}`,
    learningResourceType: "Interactive simulation",
    educationalLevel: "Intermediate",
    inLanguage: "en",
    isAccessibleForFree: true,
    teaches: seo.teaches,
    about: topic.category,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };
}

/** Schema.org `WebSite` — tells Google the site's name is "ulearn". */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: ["ulearn systems", "ulearn-it"],
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
  };
}
