"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

import { ConsistentHashingEngine } from "./engine";
import type { Mode, SimSnapshot } from "./types";

/** Caps how big a single tick's delta can be after the tab was backgrounded. */
const MAX_DELTA_MS = 100;

/**
 * Runs the engine on a requestAnimationFrame loop and exposes a snapshot plus
 * the actions the control panel needs. See the load-balancer topic's
 * `use-simulation.ts` for why the engine stays a plain mutable class outside
 * React.
 */
export function useConsistentHashingSimulation() {
  const [engine] = useState(() => new ConsistentHashingEngine());
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
    setMode: (mode: Mode) => engine.setMode(mode),
    setNodeCount: (n: number) => engine.setNodeCount(n),
    setVnodes: (v: number) => engine.setVnodes(v),
    addNode: () => engine.addNode(),
    killNode: (id: number) => engine.killNode(id),
    killRandomNode: () => engine.killRandomNode(),
    injectKeys: () => engine.injectKeys(),
    runKillScenario: (mode: Mode) => engine.runKillScenario(mode),
    reset: () => engine.reset(),
  };
}
