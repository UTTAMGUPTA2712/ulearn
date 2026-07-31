"use client";

import { useEffect, useState } from "react";

import { LoadBalancerEngine } from "./engine";
import type { Algorithm, Fault, SimSnapshot } from "./types";

/** Caps how big a single tick's delta can be after the tab was backgrounded. */
const MAX_DELTA_MS = 100;

/**
 * Runs the engine on a requestAnimationFrame loop and exposes a snapshot plus
 * the actions a control panel needs. The engine itself stays a plain mutable
 * class outside React — re-rendering 4-70 small SVG nodes at 60fps is cheap,
 * but there's no reason to route every tick through React's reconciler twice.
 */
export function useLoadBalancerSimulation() {
  // Lazy `useState` initializer, not a ref: it needs to run exactly once and
  // produce a value read during render, which is what refs aren't for.
  const [engine] = useState(() => new LoadBalancerEngine());
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
    setWeight: (id: string, weight: number) => engine.setWeight(id, weight),
    toggleHealthy: (id: string) => engine.toggleHealthy(id),
    setFault: (id: string, fault: Fault) => engine.setFault(id, fault),
    setAutoStream: (enabled: boolean, rate?: number) => engine.setAutoStream(enabled, rate),
    setDdos: (active: boolean) => engine.setDdos(active),
    sendOne: () => engine.spawnRequest(),
  };
}
