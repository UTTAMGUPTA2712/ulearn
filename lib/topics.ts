/**
 * The topic list. Just enough to render the homepage index — it is not a
 * content engine. Each topic's actual page, simulation and study material is
 * hand-built under its own `app/topics/<slug>/` route with nothing shared
 * between topics beyond this listing entry and the page shell components.
 */
export type Topic = {
  slug: string;
  title: string;
  tagline: string;
  category: string;
  status: "available" | "planned";
};

export const topics: readonly Topic[] = [
  {
    slug: "load-balancer",
    title: "Load Balancer",
    tagline:
      "Round robin, least connections, weighted and IP-hash routing — watch requests get distributed and rerouted live as backends fail.",
    category: "Traffic & Routing",
    status: "available",
  },
  {
    slug: "circuit-breaker",
    title: "Circuit Breaker",
    tagline: "Open, half-open and closed states protecting a failing dependency.",
    category: "Resilience",
    status: "planned",
  },
  {
    slug: "message-queue",
    title: "Message Queue",
    tagline: "Producers, consumers, backpressure, and what happens when a consumer dies mid-job.",
    category: "Async & Messaging",
    status: "planned",
  },
  {
    slug: "consistent-hashing",
    title: "Consistent Hashing",
    tagline: "Why adding one node shouldn't reshuffle your entire cache.",
    category: "Data & Caching",
    status: "planned",
  },
];
