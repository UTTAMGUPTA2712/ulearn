"use client";

import { useEffect, useState } from "react";

import { MechanicsEngine } from "./mechanics-engine";
import type { MechanicsSnapshot } from "./mechanics-types";

/** Caps how big a single tick's delta can be after the tab was backgrounded. */
const MAX_DELTA_MS = 100;

export function useMechanicsSimulation() {
  const [engine] = useState(() => new MechanicsEngine());
  const [snapshot, setSnapshot] = useState<MechanicsSnapshot>(() => engine.getSnapshot());

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
    setAutoPublish: (enabled: boolean, rate?: number) => engine.setAutoPublish(enabled, rate),
    publishOne: () => engine.publishOne(),
    addConsumer: () => engine.addConsumer(),
    removeConsumer: () => engine.removeConsumer(),
    addGroup: () => engine.addGroup(),
    removeGroup: () => engine.removeGroup(),
    setGroupPollRate: (id: number, rate: number) => engine.setGroupPollRate(id, rate),
    setKafkaCapacity: (n: number) => engine.setKafkaCapacity(n),
  };
}
