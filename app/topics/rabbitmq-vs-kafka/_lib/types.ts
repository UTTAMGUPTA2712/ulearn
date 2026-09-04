import type { ReactNode } from "react";

/**
 * Types for the RabbitMQ vs Kafka comparison topic.
 *
 * Unlike this app's other topics, there's no single running mechanism to
 * animate here — the "simulation" is a decision tool. A reader describes
 * their workload as six independent traits, `recommend()` (see
 * `./recommend.ts`) scores both architectures against those traits, and the
 * diagram/result panel react to whichever one comes out ahead. The same
 * trait vocabulary is reused by the curated scenarios in `./scenarios.ts` so
 * a scenario can be "loaded" straight into the matcher as a preset.
 */

export type Broker = "rabbitmq" | "kafka";

/** Do consumers ever need to reprocess messages after they've already been consumed once? */
export type ReplayNeed = "none" | "replay";

/** Is delivery a flat "give it to whoever's free" / "give it to everyone", or does it depend on message content? */
export type RoutingComplexity = "simple" | "complex";

/** Rough traffic tier — the point where a single shared queue stops being the bottleneck. */
export type ThroughputTier = "moderate" | "high";

/** What ordering guarantee the workload actually depends on. */
export type OrderingNeed = "none" | "per-key" | "strict";

/** A pool of workers splitting one backlog of jobs, vs. several independent systems each needing the full stream. */
export type ConsumerPattern = "workers" | "fanout";

/** Does the data stop mattering once it's processed, or does it need to stick around as a system of record? */
export type RetentionNeed = "transient" | "durable";

export interface Requirements {
  replay: ReplayNeed;
  routing: RoutingComplexity;
  throughput: ThroughputTier;
  ordering: OrderingNeed;
  consumers: ConsumerPattern;
  retention: RetentionNeed;
}

/** One trait's contribution to the recommendation, in plain language, attributed to whichever broker it favors. */
export interface TraitReason {
  /** Stable per-trait id ("replay", "routing", ...) — used as the list key since `text` is now JSX, not a primitive. */
  id: string;
  broker: Broker;
  /** JSX so the reasoning can wire jargon through `<Term>`, same as Simulate's control-panel copy. */
  text: ReactNode;
}

export interface Recommendation {
  /** "either" when the two scores are close enough that the choice should come down to team/ops preference, not architecture. */
  leader: Broker | "either";
  rabbitScore: number;
  kafkaScore: number;
  reasons: TraitReason[];
}

export interface Scenario {
  slug: string;
  title: string;
  /** One line describing what the traffic actually looks like. */
  shape: string;
  requirements: Requirements;
  /** "either" is a deliberate teaching case — not every scenario should resolve to a clean winner. */
  recommendation: Broker | "either";
  /** Mechanism-level explanation of why the recommended broker fits — not a generic claim. */
  why: string;
  /** The concrete friction you'd hit picking the other one for this scenario. */
  whyNotOther: string;
}
