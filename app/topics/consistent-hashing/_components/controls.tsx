"use client";

import { useState } from "react";

import { Button } from "@/components/simulation/button";
import { Term } from "@/components/study/term";

import { INJECT_COUNT, MAX_KEYS, MAX_NODES, MAX_VNODES, MIN_NODES, MIN_VNODES } from "../_lib/engine";
import { GLOSSARY } from "../_lib/glossary";
import type { Mode } from "../_lib/types";

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">{children}</p>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[11px] leading-relaxed text-text-faint">{children}</p>;
}

export function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div>
      <Heading>Sharding scheme</Heading>
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Sharding scheme">
        <Button active={mode === "modulo"} aria-pressed={mode === "modulo"} onClick={() => onChange("modulo")}>
          Naive modulo
        </Button>
        <Button active={mode === "ring"} aria-pressed={mode === "ring"} onClick={() => onChange("ring")}>
          Hash ring
        </Button>
      </div>
      <Hint>
        {mode === "modulo" ? (
          <>
            <Term id="modulo-hashing" glossary={GLOSSARY}>
              hash(key) % N
            </Term>{" "}
            picks a column. Perfectly even, until N changes and nearly every remainder changes with it.
          </>
        ) : (
          <>
            Keys and nodes share one{" "}
            <Term id="hash-ring" glossary={GLOSSARY}>
              ring
            </Term>
            ; each key belongs to the{" "}
            <Term id="clockwise-lookup" glossary={GLOSSARY}>
              next node clockwise
            </Term>
            . A change only touches the arcs next to it.
          </>
        )}
      </Hint>
    </div>
  );
}

/**
 * A range input that previews while dragging but only commits on release,
 * so one drag from 5 to 8 counts as one topology change, not three.
 */
function CommitSlider({
  label,
  value,
  min,
  max,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? value;
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };

  return (
    <label className="flex items-center gap-2 text-sm text-text-muted">
      <span className="w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={shown}
        disabled={disabled}
        aria-valuetext={`${shown}`}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="min-w-0 flex-1 accent-accent disabled:opacity-40"
      />
      <span className="w-8 text-right font-mono text-text">{shown}</span>
    </label>
  );
}

export function ClusterControls({
  mode,
  nodeCount,
  vnodes,
  onSetNodeCount,
  onSetVnodes,
  onAddNode,
  onKillRandom,
}: {
  mode: Mode;
  nodeCount: number;
  vnodes: number;
  onSetNodeCount: (n: number) => void;
  onSetVnodes: (v: number) => void;
  onAddNode: () => void;
  onKillRandom: () => void;
}) {
  return (
    <div>
      <Heading>Cluster</Heading>
      <div className="mt-2 space-y-2">
        <CommitSlider label="Nodes" value={nodeCount} min={MIN_NODES} max={MAX_NODES} onCommit={onSetNodeCount} />
        <CommitSlider
          label="V-nodes each"
          value={vnodes}
          min={MIN_VNODES}
          max={MAX_VNODES}
          disabled={mode === "modulo"}
          onCommit={onSetVnodes}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button danger onClick={onKillRandom} disabled={nodeCount <= MIN_NODES}>
          Kill random node
        </Button>
        <Button onClick={onAddNode} disabled={nodeCount >= MAX_NODES}>
          Add node
        </Button>
      </div>
      <Hint>
        {mode === "modulo" ? (
          <>
            <Term id="virtual-node" glossary={GLOSSARY}>
              Virtual nodes
            </Term>{" "}
            only exist on the ring; switch to it to use them. The cluster keeps at least {MIN_NODES} nodes.
          </>
        ) : (
          <>
            Each node takes this many{" "}
            <Term id="virtual-node" glossary={GLOSSARY}>
              virtual nodes
            </Term>{" "}
            on the ring. Drag it to 1 to see{" "}
            <Term id="hot-spot" glossary={GLOSSARY}>
              hot spots
            </Term>
            , then past 100.
          </>
        )}
      </Hint>
    </div>
  );
}

export function KeyControls({
  keyCount,
  onInject,
  onReset,
}: {
  keyCount: number;
  onInject: () => void;
  onReset: () => void;
}) {
  return (
    <div>
      <Heading>Keys</Heading>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button primary onClick={onInject} disabled={keyCount >= MAX_KEYS}>
          Inject {INJECT_COUNT} keys
        </Button>
        <Button onClick={onReset} className="ml-auto">
          Reset
        </Button>
      </div>
      <Hint>
        Keys like <span className="font-mono">user:7919</span> are cached on whichever node owns them. Up to{" "}
        {MAX_KEYS} keys.
      </Hint>
    </div>
  );
}

export function Scenarios({ onRun }: { onRun: (mode: Mode) => void }) {
  return (
    <div>
      <Heading>Try it</Heading>
      <div className="mt-2 grid gap-2">
        <div className="rounded-xl border border-border bg-panel p-3">
          <Button danger onClick={() => onRun("modulo")}>
            Modulo: kill 1 of 5
          </Button>
          <Hint>
            5 nodes, {INJECT_COUNT} keys, then N2 dies. Watch the sea of red: keys on healthy nodes move too,
            because every remainder changed.
          </Hint>
        </div>
        <div className="rounded-xl border border-border bg-panel p-3">
          <Button danger onClick={() => onRun("ring")}>
            Ring: kill 1 of 5
          </Button>
          <Hint>
            Same cluster, same keys, same victim. Only N2&apos;s keys slide clockwise to their next node; the rest
            stay put.
          </Hint>
        </div>
      </div>
    </div>
  );
}
