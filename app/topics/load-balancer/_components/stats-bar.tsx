import type { Stats } from "../_lib/types";

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-sm font-semibold" style={color ? { color } : undefined}>
        {value}
      </span>
      <span className="text-[11px] font-medium text-text-faint">{label}</span>
    </div>
  );
}

export function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-border bg-panel px-5 py-4 shadow-sm">
      <Stat label="sent" value={stats.sent} />
      <Stat label="success" value={stats.success} color="var(--status-up)" />
      <Stat label="error" value={stats.error} color="var(--status-down)" />
      <Stat label="timeout" value={stats.timeout} color="var(--status-warn)" />
      <Stat label="rejected" value={stats.rejected} color="var(--status-down)" />
    </div>
  );
}
