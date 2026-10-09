"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

import { ConcurrencyEngine } from "./engine";
import type { Scheduling, SimSnapshot, Workload } from "./types";

/** Caps how big a single tick's delta can be after the tab was backgrounded. */
const MAX_DELTA_MS = 100;

/**
 * Runs the engine on a requestAnimationFrame loop and exposes a snapshot plus
 * the actions the control panel needs. See the load-balancer topic's
 * `use-simulation.ts` for why the engine stays a plain mutable class outside
 * React.
 */
export function useConcurrencySimulation() {
  const [engine] = useState(() => new ConcurrencyEngine());
  const [snapshot, setSnapshot] = useState<SimSnapshot>(() => engine.getSnapshot());
  const reducedMotion = usePrefersReducedMotion();

  // Reduced motion makes `run()` jump straight to the finished timeline.
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
    setWorkload: (w: Workload) => engine.setWorkload(w),
    setScheduling: (s: Scheduling) => engine.setScheduling(s),
    setCores: (n: number) => engine.setCores(n),
    setSpeed: (speed: number) => engine.setSpeed(speed),
    run: () => engine.run(),
    pause: () => engine.pause(),
    resetRun: () => engine.resetRun(),
    clearRuns: () => engine.clearRuns(),
    runScenario: (w: Workload, s: Scheduling, cores: number) => engine.runScenario(w, s, cores),
  };
}
