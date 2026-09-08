"use client";

import { useEffect, useState } from "react";

import { ConcurrencyEngine } from "./engine";
import type { Mode, SimSnapshot } from "./types";
import { usePrefersReducedMotion } from "./use-reduced-motion";

/** Caps how big a single tick's delta can be after the tab was backgrounded. */
const MAX_DELTA_MS = 100;

/**
 * Runs one looping engine instance on a requestAnimationFrame loop and
 * exposes its latest snapshot. `mode` (and `workerCount`, for "parallel")
 * are read once at mount — this screen shows exactly one mode for its whole
 * lifetime, so there's no setter to expose. See the load-balancer topic's
 * `use-simulation.ts` for why the engine stays a plain mutable class
 * outside React.
 */
export function useConcurrencySimulation(mode: Mode, workerCount?: number) {
  const [engine] = useState(() => new ConcurrencyEngine(mode, workerCount));
  const [snapshot, setSnapshot] = useState<SimSnapshot>(() => engine.getSnapshot());
  const reducedMotion = usePrefersReducedMotion();

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

  return { snapshot, reducedMotion };
}
