export type StatItem = {
  /** Usually a plain string; a `ReactNode` is allowed so a label can embed something like a `<Term>` glossary popover on a jargon word. */
  label: React.ReactNode;
  /** A plain number, or a pre-formatted string (e.g. `"1.23s"`) for values that need units/precision. */
  value: number | string;
  /** CSS color value, e.g. `var(--status-up)`. Omit for the default `--text` color. */
  color?: string;
};

function Stat({ label, value, color }: StatItem) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-sm font-semibold" style={color ? { color } : undefined}>
        {value}
      </span>
      <span className="text-[11px] font-medium text-text-faint">{label}</span>
    </div>
  );
}

/** Dense inline label/value row for a running simulation's headline numbers (see §10). */
export function StatsBar({ items }: { items: StatItem[] }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-border bg-panel px-5 py-4 shadow-sm">
      {items.map((item, i) => (
        // index is fine here — `items` is a fixed-shape array rebuilt fresh
        // every render, never reordered or filtered by the caller.
        <Stat key={i} {...item} />
      ))}
    </div>
  );
}
