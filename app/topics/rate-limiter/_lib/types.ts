/**
 * Types for the rate limiter simulation. Colocated with this topic's route
 * on purpose — nothing here is shared with other topics.
 */

export type Algorithm = "fixed-window" | "sliding-window" | "token-bucket" | "leaky-bucket";

export interface ClientState {
  clientId: string;
  /** Fixed window bookkeeping. */
  windowStart: number;
  windowCount: number;
  /** Sliding window log — timestamps still inside the trailing window. */
  log: number[];
  /** Token bucket — tokens currently available, refilled continuously up to `limit`. */
  tokens: number;
  lastRefill: number;
  /** Leaky bucket — current queue level, drained continuously down to 0. */
  level: number;
  lastLeak: number;
  allowed: number;
  limited: number;
}

export type RequestOutcome = "allowed" | "limited" | "throttled" | "overloaded";
/** `held` is an open-but-incomplete connection — see Slowloris in `attackKind`. */
export type RequestPhase = "to-limiter" | "to-global" | "to-api" | "held" | "returning" | "done";

/**
 * HTTP-layer attacks the diagram can actually route through its pipeline.
 * `http-flood` completes real requests and hits the per-client/global
 * limiters like any other traffic. `slowloris` never sends a complete
 * request, so it bypasses both limiters entirely and ties up a raw
 * connection slot instead — see `resolveSlowlorisArrival` in the engine.
 */
export type AttackKind = "http-flood" | "slowloris";

/**
 * Attacks below the HTTP layer never enter the request pipeline at all —
 * there is no HTTP request for a rate limiter to see. They're rendered
 * separately as `BlockedPacket`s that flash and vanish before ever
 * reaching the client node.
 */
export type NetworkAttackKind = "syn-flood" | "udp-amplification";

export type AttackType = AttackKind | NetworkAttackKind;

export interface RequestPacket {
  id: number;
  clientId: string;
  phase: RequestPhase;
  phaseStart: number;
  phaseDuration: number;
  outcome: RequestOutcome | null;
  isDdos: boolean;
  attackKind?: AttackKind;
  fromNode?: "client" | "limiter" | "global" | "api";
  toNode?: "client" | "limiter" | "global" | "api";
}

/** A network/protocol-layer attack packet that never reaches the app — see `NetworkAttackKind`. */
export interface BlockedPacket {
  id: number;
  kind: NetworkAttackKind;
  spawnTime: number;
  /** Spoofed source, tracked purely so the UI can show how many distinct addresses were involved. */
  clientId: string;
}

export interface LogEntry {
  id: number;
  time: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface Stats {
  sent: number;
  allowed: number;
  limited: number;
  /** Rejected by the server-wide limiter — see `globalLimiterActive`. Distinct from `limited`, which is per-client. */
  throttled: number;
  /** Passed every limiter but got dropped because the API itself was saturated — see `MAX_CONCURRENT_API` or `slowlorisCapacity`. */
  overloaded: number;
  /** Network/protocol-layer attack packets that never reached the app at all — see `NetworkAttackKind`. */
  blocked: number;
}

export interface SimSnapshot {
  now: number;
  algorithm: Algorithm;
  limit: number;
  windowMs: number;
  refillRate: number;
  requests: RequestPacket[];
  clients: ClientState[];
  log: LogEntry[];
  stats: Stats;
  autoStream: boolean;
  autoStreamRate: number;
  /** Which attack, if any, is currently running — null means no attack traffic. */
  activeAttack: AttackType | null;
  /** Distinct spoofed source addresses seen in the current attack run — see `RateLimiterEngine.attackSourceIds`. */
  attackSourceCount: number;
  /** Network-layer attack packets, rendered flashing near the client edge — they never enter `requests`. */
  blockedPackets: BlockedPacket[];
  /** How many Slowloris connections are currently held open. */
  slowlorisHeld: number;
  slowlorisCapacity: number;
  /** Whether the server-wide limiter sits between the per-client limiter and the API. */
  globalLimiterActive: boolean;
  globalCapacity: number;
  globalRefillRate: number;
  globalTokens: number;
}
