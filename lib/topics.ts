/**
 * The topic list. Just enough to render the homepage index — it is not a
 * content engine. Each topic's simulation logic and copy is hand-built under
 * its own `app/topics/<slug>/` route, but the recurring UI pieces (buttons,
 * stats bar, event log, topic tabs, study-page Section/ConceptCard/
 * ComparisonTable/TableOfContents) live in `components/` and should be
 * reused rather than re-implemented per topic — see docs/DESIGN-SYSTEM.md §10.
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
      "Round robin, least connections, weighted, IP-hash, URL-hash and random routing — watch requests get distributed and rerouted live as backends fail.",
    category: "Traffic & Routing",
    status: "available",
  },
  {
    slug: "rate-limiter",
    title: "Rate Limiter",
    tagline:
      "Fixed window, sliding window, token bucket and leaky bucket throttling — hammer one client, then flood from thousands of spoofed IPs and watch per-client limits stop helping.",
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
    tagline:
      "Work queue vs. fan-out pub/sub, backpressure policies, and redelivery — kill a consumer mid-job and watch the visibility timeout, retries and dead-letter queue take over.",
    category: "Async & Messaging",
    status: "available",
  },
  {
    slug: "consistent-hashing",
    title: "Consistent Hashing",
    tagline: "Why adding one node shouldn't reshuffle your entire cache.",
    category: "Data & Caching",
    status: "planned",
  },
  {
    slug: "redis-protocol",
    title: "Redis Protocol",
    tagline:
      "RESP wire format and pipelining — why a single-threaded event loop can still be this fast.",
    category: "Data & Caching",
    status: "planned",
  },
  {
    slug: "rabbitmq-vs-kafka",
    title: "RabbitMQ vs Kafka",
    tagline:
      "Smart broker vs dumb log — watch the same event get pushed and deleted on one side while it sits in a log getting pulled by independent consumer groups on the other.",
    category: "Async & Messaging",
    status: "available",
  },
  {
    slug: "resilient-message-handling",
    title: "Resilient Message Handling",
    tagline:
      "Retries, dead-letter queues and idempotency keys — getting a message processed exactly once, not zero or twice.",
    category: "Async & Messaging",
    status: "planned",
  },
  {
    slug: "concurrency-vs-parallelism",
    title: "Concurrency vs Parallelism vs Multithreading vs Multiprocessing",
    tagline:
      "Threads, processes and the GIL — what's actually running at once versus what's just interleaved.",
    category: "Compute & Concurrency",
    status: "planned",
  },
  {
    slug: "rbac",
    title: "RBAC",
    tagline:
      "Role-based access control for multi-tenant systems — roles, permissions, and where the check actually runs.",
    category: "Auth & Access",
    status: "planned",
  },
  {
    slug: "multi-tenancy",
    title: "Multi-Tenancy",
    tagline:
      "Shared schema, siloed schema, or siloed database — isolating tenants without running N copies of your app.",
    category: "Architecture",
    status: "planned",
  },
  {
    slug: "socket-io",
    title: "Socket.IO",
    tagline:
      "How Socket.IO actually works — the polling-to-websocket upgrade handshake, rooms, and reconnection.",
    category: "Traffic & Routing",
    status: "planned",
  },
];
