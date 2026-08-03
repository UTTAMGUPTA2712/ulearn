import { cn } from "@/lib/utils/cn";

export type LogEntry = {
  id: number | string;
  time: number;
  level: "info" | "warn" | "error";
  message: string;
};

const LEVEL_COLOR: Record<LogEntry["level"], string> = {
  info: "text-text-muted",
  warn: "text-status-warn",
  error: "text-status-down",
};

/** Scrolling event log for a running simulation. Genuinely a log, so it stays monospace. */
export function EventLog({ entries, className }: { entries: LogEntry[]; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Event log</p>
      <div className="mt-2 h-48 flex-1 overflow-y-auto rounded-xl border border-border bg-panel p-3 font-mono text-[11px] leading-relaxed">
        {entries.length === 0 && <p className="text-text-faint">Waiting for traffic…</p>}
        {[...entries].reverse().map((entry) => (
          <p key={entry.id} className={cn("truncate", LEVEL_COLOR[entry.level])}>
            <span className="text-text-faint">{(entry.time / 1000).toFixed(1)}s</span> {entry.message}
          </p>
        ))}
      </div>
    </div>
  );
}
