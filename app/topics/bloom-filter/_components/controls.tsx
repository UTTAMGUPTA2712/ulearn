"use client";

import { useId } from "react";

import { Button } from "@/components/simulation/button";
import { Term } from "@/components/study/term";

import { K_MAX, K_MIN, M_MAX, M_MIN, M_STEP, MAX_KEY_LENGTH, QUERY_BATCH_SIZE, SATURATE_TARGET } from "../_lib/engine";
import { GLOSSARY } from "../_lib/glossary";

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">{children}</p>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[11px] leading-relaxed text-text-faint">{children}</p>;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between text-sm text-text-muted">
        <label htmlFor={id}>{label}</label>
        <span className="font-mono font-semibold text-text">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-accent disabled:opacity-40"
      />
    </div>
  );
}

export function ShapeControls({
  m,
  k,
  n,
  busy,
  onSetM,
  onSetK,
}: {
  m: number;
  k: number;
  n: number;
  busy: boolean;
  onSetM: (m: number) => void;
  onSetK: (k: number) => void;
}) {
  const optimalK = n > 0 ? (m / n) * Math.LN2 : null;
  return (
    <div>
      <Heading>Filter shape</Heading>
      <Slider
        label={<><Term id="bit-array" glossary={GLOSSARY}>Bit array size</Term> (m)</>}
        value={m}
        min={M_MIN}
        max={M_MAX}
        step={M_STEP}
        disabled={busy}
        onChange={onSetM}
      />
      <Slider
        label={<><Term id="k-hashes" glossary={GLOSSARY}>Hash functions</Term> (k)</>}
        value={k}
        min={K_MIN}
        max={K_MAX}
        step={1}
        disabled={busy}
        onChange={onSetK}
      />
      <Hint>
        {optimalK === null ? (
          <>Changing either one rebuilds the filter from the stored keys — a real Bloom filter can&apos;t be resized in place.</>
        ) : optimalK > K_MAX ? (
          <>
            With only {n} key{n === 1 ? "" : "s"} in {m} bits the array is mostly empty, so any k up to {K_MAX} keeps
            false positives rare. Changing m or k rebuilds the filter from the stored keys.
          </>
        ) : (
          <>
            With {n} keys in {m} bits, the best k is (m/n)·ln 2 ≈{" "}
            <span className="font-mono text-text-muted">{optimalK.toFixed(1)}</span>. Changing m or k rebuilds the
            filter from the stored keys.
          </>
        )}
      </Hint>
    </div>
  );
}

export function KeyControls({
  keyInput,
  recentKeys,
  busy,
  onKeyInput,
  onInsert,
  onCheck,
  onReset,
}: {
  keyInput: string;
  recentKeys: string[];
  busy: boolean;
  onKeyInput: (key: string) => void;
  onInsert: () => void;
  onCheck: () => void;
  onReset: () => void;
}) {
  const inputId = useId();
  return (
    <div>
      <Heading>Keys</Heading>
      <form
        className="mt-2 flex flex-wrap items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          onCheck();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Key
        </label>
        <input
          id={inputId}
          type="text"
          value={keyInput}
          onChange={(e) => onKeyInput(e.target.value)}
          placeholder="blank = random key"
          maxLength={MAX_KEY_LENGTH}
          autoComplete="off"
          spellCheck={false}
          className="w-full min-w-0 rounded-full border border-border bg-panel px-3 py-1.5 font-mono text-sm text-text placeholder:text-text-faint hover:border-border-strong"
        />
        <Button primary onClick={onInsert} disabled={busy}>
          Insert key
        </Button>
        <Button type="submit" disabled={busy}>
          Check key
        </Button>
        <Button onClick={onReset} className="ml-auto">
          Reset
        </Button>
      </form>
      {recentKeys.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-text-faint">recent:</span>
          {recentKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onKeyInput(key)}
              aria-label={`Use key ${key}`}
              className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              {key}
            </button>
          ))}
        </div>
      )}
      <Hint>
        Leave the box blank and Insert adds a random <span className="font-mono">user:NNNNN</span>, while Check
        asks about one that was never inserted. Click a recent key to check it again.
      </Hint>
    </div>
  );
}

export function StressControls({
  busy,
  onQuery,
  onSaturate,
}: {
  busy: boolean;
  onQuery: () => void;
  onSaturate: () => void;
}) {
  return (
    <div>
      <Heading>Stress it</Heading>
      <div className="mt-2 grid gap-2">
        <div className="rounded-xl border border-border bg-panel p-3">
          <Button onClick={onQuery} disabled={busy}>
            Query {QUERY_BATCH_SIZE} non-existent keys
          </Button>
          <Hint>
            Every one of these is a <Term id="negative-lookup" glossary={GLOSSARY}>negative lookup</Term>. Count how
            many the filter turns away before they reach the disk.
          </Hint>
        </div>
        <div className="rounded-xl border border-border bg-panel p-3">
          <Button danger onClick={onSaturate} disabled={busy}>
            Saturate to {Math.round(SATURATE_TARGET * 100)}%
          </Button>
          <Hint>
            Keeps inserting until {Math.round(SATURATE_TARGET * 100)}% of the bits are 1. Then query absent keys
            again and watch <Term id="false-positive" glossary={GLOSSARY}>false positives</Term> leak through.
          </Hint>
        </div>
      </div>
    </div>
  );
}

export function DeleteControls({
  keyInput,
  busy,
  canRestore,
  onDelete,
  onRestore,
}: {
  keyInput: string;
  busy: boolean;
  canRestore: boolean;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const typed = keyInput.trim();
  return (
    <div>
      <Heading>Try to delete</Heading>
      <div className="mt-2 rounded-xl border border-border bg-panel p-3">
        <div className="flex flex-wrap gap-1.5">
          <Button danger active onClick={onDelete} disabled={busy}>
            {typed ? `Delete "${typed.length > 14 ? `${typed.slice(0, 13)}…` : typed}"` : "Delete key attempt"}
          </Button>
          {canRestore && (
            <Button onClick={onRestore} disabled={busy}>
              Undo delete
            </Button>
          )}
        </div>
        <Hint>
          Clears the key&apos;s k bits back to 0. With the box blank, it picks the stored key that shares the most
          bits with others. Any key that relied on one of those bits now gets a{" "}
          <Term id="false-negative" glossary={GLOSSARY}>false negative</Term>.
        </Hint>
      </div>
    </div>
  );
}
