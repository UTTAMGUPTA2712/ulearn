import type { GlossaryEntry } from "@/components/study/term";

/**
 * Single source of truth for every term this topic uses across Simulate and
 * Study. The `/glossary` tab renders this whole list; every inline `<Term>`
 * popover elsewhere looks a definition up from this same array.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "round-robin",
    term: "Round robin",
    definition:
      "Sends each new request to the next backend in a fixed rotation, looping back to the start once it reaches the end. Simple and even when every backend is roughly equal, blind to how loaded each one actually is.",
  },
  {
    id: "least-connections",
    term: "Least connections",
    definition:
      "Sends each request to whichever backend currently has the fewest active connections. Adapts to backends that are actually running slow, unlike round robin which just counts turns.",
  },
  {
    id: "weighted-round-robin",
    term: "Weighted round robin",
    definition:
      "Round robin where each backend gets a weight, and higher-weight backends receive proportionally more requests — for a bigger box that can genuinely handle more traffic than its neighbors.",
  },
  {
    id: "ip-hash",
    term: "IP hash",
    definition:
      "Hashes the client's IP address to consistently pick the same backend for the same client — useful for sticky sessions, since a client keeps landing on the same server across requests.",
  },
  {
    id: "url-hash",
    term: "URL hash",
    definition:
      "Hashes the requested path to consistently route the same URL to the same backend — useful when a backend caches per-URL and you want cache hits to stay high.",
  },
  {
    id: "sticky-session",
    term: "Sticky session",
    definition:
      "A client keeps landing on the same backend across multiple requests, instead of being spread across the pool each time — needed when a backend holds per-client state in memory.",
  },
  {
    id: "health-check",
    term: "Health check",
    definition:
      "How a load balancer detects a backend has actually gone bad — here, modeled as repeated failed requests. After enough consecutive failures, the backend is automatically marked down and stops receiving new traffic.",
  },
  {
    id: "mark-down",
    term: "Mark down (auto)",
    definition:
      "A backend getting pulled out of rotation automatically, after failing its health check too many times in a row — distinct from a human manually taking it offline.",
  },
  {
    id: "rejected",
    term: "Rejected",
    definition:
      "A request that couldn't be routed anywhere at all, because every backend is currently unhealthy. A load balancer can spread traffic across healthy backends — it can't invent capacity none of them have.",
  },
  {
    id: "ddos",
    term: "DDoS",
    definition:
      "Distributed Denial of Service — a flood of requests from many sources at once, aimed at overwhelming a system's capacity rather than exploiting a specific bug.",
  },
];
