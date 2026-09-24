"use client";

import { useId, useState } from "react";

import { Button } from "@/components/simulation/button";
import { Term } from "@/components/study/term";

import { BURST_SIZE, LOAD_THRESHOLD, TABLE_SIZES } from "../_lib/engine";
import { GLOSSARY } from "../_lib/glossary";
import { HASH_FNS } from "../_lib/hash-fns";
import type { HashFnId, Strategy } from "../_lib/types";

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">{children}</p>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[11px] leading-relaxed text-text-faint">{children}</p>;
}

export function StrategySwitch({ strategy, onChange }: { strategy: Strategy; onChange: (s: Strategy) => void }) {
  return (
    <div>
      <Heading>Collision strategy</Heading>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button active={strategy === "chaining"} onClick={() => onChange("chaining")}>
          Chaining
        </Button>
        <Button active={strategy === "open-addressing"} onClick={() => onChange("open-addressing")}>
          Open addressing
        </Button>
      </div>
      <Hint>
        {strategy === "chaining" ? (
          <>
            <Term id="chaining" glossary={GLOSSARY}>Chaining</Term>: colliding keys share the bucket as a
            list. A lookup walks the list, comparing keys one by one.
          </>
        ) : (
          <>
            <Term id="open-addressing" glossary={GLOSSARY}>Open addressing</Term> with{" "}
            <Term id="linear-probing" glossary={GLOSSARY}>linear probing</Term>: one key per slot. A taken
            slot sends the key to the next one, and the next, until it finds a free one.
          </>
        )}
      </Hint>
    </div>
  );
}

const HASH_OPTIONS: HashFnId[] = ["fnv1a", "first-letter", "length"];

export function HashFnSwitch({ hashFn, onChange }: { hashFn: HashFnId; onChange: (h: HashFnId) => void }) {
  return (
    <div>
      <Heading>Hash function</Heading>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {HASH_OPTIONS.map((id) => (
          <Button key={id} active={hashFn === id} onClick={() => onChange(id)}>
            {HASH_FNS[id].label}
            {id !== "fnv1a" && <span className="ml-1 text-text-faint">(bad)</span>}
          </Button>
        ))}
      </div>
      <Hint>
        {hashFn === "fnv1a" && (
          <>
            <Term id="fnv-1a" glossary={GLOSSARY}>FNV-1a</Term> mixes every byte of the key, so even
            &ldquo;apple&rdquo; and &ldquo;apply&rdquo; land in unrelated buckets.
          </>
        )}
        {hashFn === "first-letter" && (
          <>
            <span className="font-mono">charCode(key[0]) mod m</span>: only the first letter counts, so
            every key starting with &ldquo;s&rdquo; shares a bucket however big the table gets.
          </>
        )}
        {hashFn === "length" && (
          <>
            <span className="font-mono">key.length mod m</span>: most words are 3–8 letters long, so
            nearly every key crowds into a handful of buckets.
          </>
        )}
      </Hint>
    </div>
  );
}

export function TableControls({
  m,
  autoResize,
  onSetSize,
  onSetAutoResize,
  onResize,
}: {
  m: number;
  autoResize: boolean;
  onSetSize: (m: number) => void;
  onSetAutoResize: (enabled: boolean) => void;
  onResize: () => void;
}) {
  const maxSize = TABLE_SIZES[TABLE_SIZES.length - 1];
  return (
    <div>
      <Heading>Table size</Heading>
      <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Number of buckets">
        {TABLE_SIZES.map((size) => (
          <Button key={size} active={m === size} onClick={() => onSetSize(size)} aria-label={`${size} buckets`}>
            <span className="font-mono">{size}</span>
          </Button>
        ))}
        <span className="text-[11px] text-text-faint">buckets</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button active={autoResize} onClick={() => onSetAutoResize(!autoResize)} aria-pressed={autoResize}>
          Auto-resize at {LOAD_THRESHOLD}: {autoResize ? "on" : "off"}
        </Button>
        <Button onClick={onResize} disabled={m >= maxSize}>
          Resize now (×2)
        </Button>
      </div>
      <Hint>
        Once the <Term id="load-factor" glossary={GLOSSARY}>load factor</Term> passes {LOAD_THRESHOLD}, the
        table doubles and every key is <Term id="rehashing" glossary={GLOSSARY}>rehashed</Term> into it.
        Changing size by hand does the same.
      </Hint>
    </div>
  );
}

export function KeyControls({
  autoInsert,
  insertRate,
  onInsert,
  onBurst,
  onSetAutoInsert,
  onLookup,
  onReset,
}: {
  autoInsert: boolean;
  insertRate: number;
  onInsert: () => void;
  onBurst: () => void;
  onSetAutoInsert: (enabled: boolean, rate?: number) => void;
  onLookup: (key: string) => void;
  onReset: () => void;
}) {
  const [lookupKey, setLookupKey] = useState("");
  const inputId = useId();

  return (
    <div>
      <Heading>Keys</Heading>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button primary onClick={onInsert}>
          Insert one
        </Button>
        <Button onClick={onBurst}>Insert burst (×{BURST_SIZE})</Button>
        <Button active={autoInsert} onClick={() => onSetAutoInsert(!autoInsert)} aria-pressed={autoInsert}>
          {autoInsert ? "Stop auto-insert" : "Start auto-insert"}
        </Button>
        {autoInsert && (
          <label className="flex items-center gap-1.5 text-sm text-text-muted">
            rate
            <input
              type="range"
              min={1}
              max={5}
              value={insertRate}
              onChange={(e) => onSetAutoInsert(true, Number(e.target.value))}
              className="accent-accent"
            />
            <span className="font-mono">{insertRate}/s</span>
          </label>
        )}
      </div>

      <form
        className="mt-3 flex flex-wrap items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!lookupKey.trim()) return;
          onLookup(lookupKey);
        }}
      >
        <label htmlFor={inputId} className="text-sm text-text-muted">
          Look up
        </label>
        <input
          id={inputId}
          type="text"
          value={lookupKey}
          onChange={(e) => setLookupKey(e.target.value)}
          placeholder="e.g. apple"
          maxLength={16}
          autoComplete="off"
          spellCheck={false}
          className="w-32 min-w-0 rounded-full border border-border bg-panel px-3 py-1.5 font-mono text-sm text-text placeholder:text-text-faint hover:border-border-strong"
        />
        <Button type="submit" disabled={!lookupKey.trim()}>
          Find
        </Button>
        <Button onClick={onReset} className="ml-auto">
          Reset
        </Button>
      </form>
      <Hint>A lookup follows the same path as an insert and counts every key it compares on the way.</Hint>
    </div>
  );
}

export function BreakIt({ onBadHash, onOverfill }: { onBadHash: () => void; onOverfill: () => void }) {
  return (
    <div>
      <Heading>Break it</Heading>
      <div className="mt-2 grid gap-2">
        <div className="rounded-xl border border-border bg-panel p-3">
          <Button danger onClick={onBadHash}>
            Plug in a bad hash
          </Button>
          <Hint>
            Switches to &ldquo;first letter&rdquo; and inserts {BURST_SIZE} keys that mostly start with s, c
            or m. Watch one bucket take nearly all of them.
          </Hint>
        </div>
        <div className="rounded-xl border border-border bg-panel p-3">
          <Button danger onClick={onOverfill}>
            Overfill it
          </Button>
          <Hint>
            Turns auto-resize off and keeps inserting well past {LOAD_THRESHOLD}. Then turn auto-resize back
            on and watch every key move.
          </Hint>
        </div>
      </div>
    </div>
  );
}
