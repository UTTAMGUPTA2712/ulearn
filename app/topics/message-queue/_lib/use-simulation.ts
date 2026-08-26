"use client";

import { useEffect, useState } from "react";

import { MessageQueueEngine } from "./engine";
import type { BackpressurePolicy, DeliveryMode, SimSnapshot } from "./types";

/** Caps how big a single tick's delta can be after the tab was backgrounded. */
const MAX_DELTA_MS = 100;

/**
 * Runs the engine on a requestAnimationFrame loop and exposes a snapshot plus
 * the actions a control panel needs. See the rate-limiter topic's
 * `use-simulation.ts` for why this stays a plain mutable class outside React.
 */
export function useMessageQueueSimulation() {
  const [engine] = useState(() => new MessageQueueEngine());
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
    setMode: (mode: DeliveryMode) => engine.setMode(mode),
    setBackpressurePolicy: (policy: BackpressurePolicy) => engine.setBackpressurePolicy(policy),
    setCapacity: (n: number) => engine.setCapacity(n),
    setProcessingTimeMs: (ms: number) => engine.setProcessingTimeMs(ms),
    setFailureRate: (rate: number) => engine.setFailureRate(rate),
    setVisibilityTimeoutMs: (ms: number) => engine.setVisibilityTimeoutMs(ms),
    setMaxRetries: (n: number) => engine.setMaxRetries(n),
    setAutoPublish: (enabled: boolean, rate?: number) => engine.setAutoPublish(enabled, rate),
    addConsumer: () => engine.addConsumer(),
    removeConsumer: () => engine.removeConsumer(),
    killConsumer: (id: number) => engine.killConsumer(id),
    publishOne: () => engine.spawn(),
    publishBurst: () => engine.publishBurst(),
  };
}
