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

export type RequestOutcome = "allowed" | "limited" | "overloaded";
export type RequestPhase = "to-limiter" | "to-api" | "returning" | "done";

export interface RequestPacket {
  id: number;
  clientId: string;
  phase: RequestPhase;
  phaseStart: number;
  phaseDuration: number;
  outcome: RequestOutcome | null;
  isDdos: boolean;
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
  /** Passed the per-client limiter but got dropped because the API itself was saturated — see `MAX_CONCURRENT_API`. */
  overloaded: number;
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
  ddosActive: boolean;
}
