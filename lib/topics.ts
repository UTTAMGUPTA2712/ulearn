/**
 * The topic list. Just enough to render the homepage index — it is not a
 * content engine. Each topic's simulation logic and copy is hand-built under
 * its own `app/topics/<slug>/` route, but the recurring UI pieces (buttons,
 * stats bar, event log, topic tabs, study-page Section/ConceptCard/
 * ComparisonTable/TableOfContents) live in `components/` and should be
 * reused rather than re-implemented per topic — see docs/DESIGN-SYSTEM.md §10.
 *
 * Kept deliberately short: the shipped simulations, plus the handful
 * planned next. The rest of the topic backlog lives in README.md so this
 * file stays a build queue, not a wishlist.
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
    slug: "message-queue",
    title: "Message Queue",
    tagline:
      "Work queue vs. fan-out pub/sub, backpressure policies, and redelivery — kill a consumer mid-job and watch the visibility timeout, retries and dead-letter queue take over.",
    category: "Async & Messaging",
    status: "available",
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
    slug: "concurrency-vs-parallelism",
    title: "Concurrency vs Parallelism",
    tagline:
      "Taking turns vs. more cores — run the same tasks on one core or four, blocking or interleaved, and watch why waiting work needs concurrency and number crunching needs parallelism.",
    category: "Compute & Concurrency",
    status: "planned",
  },
  {
    slug: "circuit-breaker",
    title: "Circuit Breaker",
    tagline: "Open, half-open and closed states protecting a failing dependency.",
    category: "Resilience",
    status: "planned",
  },
  {
    slug: "hashing",
    title: "Hashing & Collisions",
    tagline:
      "Hash functions, buckets and collisions — pile keys into a table, switch between chaining and open addressing, then plug in a bad hash and watch every key crowd into one bucket.",
    category: "Data & Caching",
    status: "available",
  },
  {
    slug: "consistent-hashing",
    title: "Consistent Hashing",
    tagline:
      "Kill one node in a cache cluster — watch naive modulo hashing invalidate 90% of your keys at once, while a hash ring remaps only 1/N without a database stampede.",
    category: "Data & Caching",
    status: "available",
  },
  {
    slug: "bloom-filter",
    title: "Bloom Filter",
    tagline:
      "Stop wasted disk I/O before it starts — query absent keys to watch instant in-memory rejects, then saturate the bit array until false positives leak through.",
    category: "Data & Caching",
    status: "available",
  },
  {
    slug: "raft-consensus",
    title: "Raft Consensus",
    tagline:
      "Leader election, heartbeats and log replication — kill the leader mid-demo and watch the cluster vote in a new one before a single write is lost.",
    category: "Consistency & Consensus",
    status: "planned",
  },
];
