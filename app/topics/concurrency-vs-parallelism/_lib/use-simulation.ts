"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { ConcurrencyEngine } from "./engine";
import type { Mode, SimSnapshot, WorkloadType } from "./types";

/** Caps how big a single tick's delta can be after the tab was backgrounded. */
const MAX_DELTA_MS = 100;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * No topic (or shared component) implements this yet, so it's new,
 * topic-local plumbing rather than a gap to fix elsewhere — this is the
 * first topic whose motion is expressive enough to matter for §12.
 * `useSyncExternalStore` (rather than a `useEffect` + `setState`) is the
 * React-idiomatic way to subscribe to this kind of external browser state.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);
}

/**
 * Runs the engine on a requestAnimationFrame loop and exposes a snapshot plus
 * the actions a control panel needs. See the load-balancer topic's
 * `use-simulation.ts` for why this stays a plain mutable class outside React.
 *
 * `reducedMotion` is threaded down into the diagram, not handled here — the
 * engine's simulated time advances identically either way; only the SVG's
 * continuous lerps/pulses should collapse to instant snaps.
 */
export function useConcurrencySimulation() {
  const [engine] = useState(() => new ConcurrencyEngine());
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

  return {
    snapshot,
    reducedMotion,
    setMode: (mode: Mode) => engine.setMode(mode),
    setWorkload: (workload: WorkloadType) => engine.setWorkload(workload),
    setCoreCount: (n: number) => engine.setCoreCount(n),
    setGilQuantumMs: (ms: number) => engine.setGilQuantumMs(ms),
    setSpawnOverheadMs: (ms: number) => engine.setSpawnOverheadMs(ms),
    spawnBurst: (size?: number) => engine.spawnBurst(size),
    addTask: () => engine.addTask(),
    reset: () => engine.reset(),
  };
}
