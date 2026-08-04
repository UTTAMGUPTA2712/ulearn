"use client";

import { useEffect, useState } from "react";

import { RateLimiterEngine } from "./engine";
import type { Algorithm, AttackType, SimSnapshot } from "./types";

/** Caps how big a single tick's delta can be after the tab was backgrounded. */
const MAX_DELTA_MS = 100;

/**
 * Runs the engine on a requestAnimationFrame loop and exposes a snapshot plus
 * the actions a control panel needs. See the load-balancer topic's
 * `use-simulation.ts` for why this stays a plain mutable class outside React.
 */
export function useRateLimiterSimulation() {
  const [engine] = useState(() => new RateLimiterEngine());
  const [snapshot, setSnapshot] = useState<SimSnapshot>(() => engine.getSnapshot());

  useEffect(() => {
    let lastTime = performance.now();
    let frame = 0;

    const loop = (time: number) => {
      const delta = Math.min(time - lastTime, MAX_DELTA_MS);
      lastTime = time;
      engine.tick(delta);
      setSnapshot(engine.getSnapshot());
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine]);

  return {
    snapshot,
    setAlgorithm: (algorithm: Algorithm) => engine.setAlgorithm(algorithm),
    setLimit: (limit: number) => engine.setLimit(limit),
    setWindowMs: (ms: number) => engine.setWindowMs(ms),
    setRefillRate: (rate: number) => engine.setRefillRate(rate),
    setAutoStream: (enabled: boolean, rate?: number) => engine.setAutoStream(enabled, rate),
    setAttack: (attack: AttackType | null) => engine.setAttack(attack),
    setGlobalLimiter: (active: boolean) => engine.setGlobalLimiter(active),
    setGlobalCapacity: (capacity: number) => engine.setGlobalCapacity(capacity),
    setGlobalRefillRate: (rate: number) => engine.setGlobalRefillRate(rate),
    sendOne: () => engine.spawnRequest(),
    hammerClient: () => engine.hammerClient(),
  };
}
