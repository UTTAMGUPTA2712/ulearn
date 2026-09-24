"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

import { HashingEngine } from "./engine";
import type { HashFnId, SimSnapshot, Strategy } from "./types";

/** Caps how big a single tick's delta can be after the tab was backgrounded. */
const MAX_DELTA_MS = 100;

/**
 * Runs the engine on a requestAnimationFrame loop and exposes a snapshot plus
 * the actions the control panel needs. See the load-balancer topic's
 * `use-simulation.ts` for why the engine stays a plain mutable class outside
 * React.
 */
export function useHashingSimulation() {
  const [engine] = useState(() => new HashingEngine());
  const [snapshot, setSnapshot] = useState<SimSnapshot>(() => engine.getSnapshot());
  const reducedMotion = usePrefersReducedMotion();

  // The engine owns animation timing, so it's the one that has to know to skip it.
  useEffect(() => {
    engine.setReducedMotion(reducedMotion);
  }, [engine, reducedMotion]);

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
    reducedMotion,
    setStrategy: (strategy: Strategy) => engine.setStrategy(strategy),
    setHashFn: (hashFn: HashFnId) => engine.setHashFn(hashFn),
    setSize: (m: number) => engine.setSize(m),
    resize: () => engine.resize(),
    setAutoResize: (enabled: boolean) => engine.setAutoResize(enabled),
    setAutoInsert: (enabled: boolean, rate?: number) => engine.setAutoInsert(enabled, rate),
    insert: () => engine.insert(),
    insertBurst: () => engine.insertBurst(),
    lookup: (key: string) => engine.lookup(key),
    plugBadHash: () => engine.plugBadHash(),
    overfill: () => engine.overfill(),
    reset: () => engine.reset(),
  };
}
