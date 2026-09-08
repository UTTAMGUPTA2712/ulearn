"use client";

import { useState } from "react";

import { Button } from "@/components/simulation/button";

import { MemoryScreen } from "./memory-screen";
import { TaskFlowScreen } from "./task-flow-screen";

type ScreenId = "sequential" | "concurrent" | "parallel" | "multithreading" | "multiprocessing";

const SCREENS: { id: ScreenId; label: string }[] = [
  { id: "sequential", label: "Sequential" },
  { id: "concurrent", label: "Concurrent" },
  { id: "parallel", label: "Parallel" },
  { id: "multithreading", label: "Multithreading" },
  { id: "multiprocessing", label: "Multiprocessing" },
];

/**
 * Five self-playing screens instead of one simulation behind a control
 * panel. Each screen is its own component with its own looping animation —
 * switching screens is the only interaction this page asks for; nothing on
 * a screen itself is a button, slider or toggle. `key={screen}` forces a
 * clean remount (and so a fresh loop) every time the reader switches.
 */
export function ConcurrencySimulation() {
  const [screen, setScreen] = useState<ScreenId>("sequential");
  const index = SCREENS.findIndex((s) => s.id === screen);

  const goTo = (i: number) => setScreen(SCREENS[Math.max(0, Math.min(SCREENS.length - 1, i))].id);

  return (
    // The diagrams' viewBox is a fixed, moderate aspect ratio — without this cap, `Container`'s
    // fluid full-bleed width (see components/layout/container.tsx) stretches this block far wider
    // than the SVGs are drawn for, and the browser letterboxes them instead of filling the space.
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {SCREENS.map((s, i) => (
          <Button key={s.id} active={s.id === screen} onClick={() => setScreen(s.id)}>
            <span className="mr-1.5 font-mono text-[10px] text-text-faint">{i + 1}</span>
            {s.label}
          </Button>
        ))}
      </div>

      <div key={screen}>
        {screen === "sequential" && <TaskFlowScreen mode="sequential" />}
        {screen === "concurrent" && <TaskFlowScreen mode="concurrent" />}
        {screen === "parallel" && <TaskFlowScreen mode="parallel" />}
        {screen === "multithreading" && <MemoryScreen kind="threads" />}
        {screen === "multiprocessing" && <MemoryScreen kind="processes" />}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <Button onClick={() => goTo(index - 1)} disabled={index === 0}>
          ← Previous
        </Button>
        <span className="text-xs text-text-faint">
          {index + 1} / {SCREENS.length}
        </span>
        <Button onClick={() => goTo(index + 1)} disabled={index === SCREENS.length - 1}>
          Next →
        </Button>
      </div>
    </div>
  );
}
