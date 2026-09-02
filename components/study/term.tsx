"use client";

import { useId, useState } from "react";

export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
}

/**
 * Inline hover/focus-triggered definition for a jargon word. Deliberately
 * dumb: it takes a `glossary` array and looks `id` up in it, so the
 * definition itself lives in exactly one place — the topic's own
 * `_lib/glossary.ts` — and both this popover and that topic's `/glossary`
 * page read the same entries rather than each keeping its own copy that can
 * drift. Reusable across topics: pass your topic's glossary array.
 *
 * Renders a focusable `<span role="button">` rather than a real `<button>`
 * so it's always safe to nest inside other interactive text (labels,
 * captions) without creating invalid nested-button markup.
 */
export function Term({
  id,
  glossary,
  children,
}: {
  id: string;
  glossary: readonly GlossaryEntry[];
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const entry = glossary.find((e) => e.id === id);

  // Fail open — a typo'd id should never take the whole page down, just
  // silently degrade to plain, non-interactive text.
  if (!entry) return <>{children}</>;

  return (
    <span className="relative inline-block">
      <span
        tabIndex={0}
        role="button"
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="cursor-help border-b border-dotted border-text-faint text-inherit hover:border-accent hover:text-accent"
      >
        {children ?? entry.term}
      </span>
      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          className="pointer-events-none absolute top-full left-1/2 z-20 mt-2 w-64 -translate-x-1/2 rounded-lg border border-border-strong bg-panel-raised p-3 text-left text-xs leading-relaxed font-normal whitespace-normal text-text-muted shadow-sm"
        >
          <span className="block text-[11px] font-semibold text-text">{entry.term}</span>
          <span className="mt-1 block">{entry.definition}</span>
        </span>
      )}
    </span>
  );
}
