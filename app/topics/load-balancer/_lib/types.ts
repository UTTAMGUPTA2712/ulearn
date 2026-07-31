/**
 * Types for the load balancer simulation. Colocated with this topic's route
 * on purpose — nothing here is shared with other topics.
 */

export type Algorithm = "round-robin" | "least-connections" | "weighted" | "ip-hash";

export type Fault = "none" | "slow" | "erroring" | "overloaded" | "timeout";

export interface Backend {
  id: string;
  label: string;
  /** Manual "server is powered on" switch — a down backend is never routed to. */
  healthy: boolean;
  /** Set automatically after repeated failures, to be told apart from a manual toggle. */
  autoMarkedDown: boolean;
  weight: number;
  fault: Fault;
  activeConnections: number;
  totalHandled: number;
  totalErrors: number;
  consecutiveFailures: number;
  /** Nginx-style smooth weighted round robin bookkeeping. */
  currentWeight: number;
}

export type RequestOutcome = "success" | "error" | "timeout" | "rejected";
export type RequestPhase = "to-lb" | "to-backend" | "stalled" | "returning" | "done";

export interface RequestPacket {
  id: number;
  clientId: string;
  algorithm: Algorithm;
  backendId: string | null;
  phase: RequestPhase;
  phaseStart: number;
  phaseDuration: number;
  outcome: RequestOutcome | null;
  /** Decided the instant routing happens; applied once the packet visually arrives. */
  plannedOutcome: RequestOutcome | null;
  isDdos: boolean;
  /** 0 = fresh, 1 = already retried once after a timeout. */
  retryCount: number;
}

export interface LogEntry {
  id: number;
  time: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface Stats {
  sent: number;
  success: number;
  error: number;
  timeout: number;
  rejected: number;
}

export interface SimSnapshot {
  now: number;
  algorithm: Algorithm;
  backends: Backend[];
  requests: RequestPacket[];
  log: LogEntry[];
  stats: Stats;
  autoStream: boolean;
  autoStreamRate: number;
  ddosActive: boolean;
}
