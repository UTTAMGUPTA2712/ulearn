import { cn } from "@/lib/utils/cn";

import type { LogEntry } from "../_lib/types";

const LEVEL_COLOR: Record<LogEntry["level"], string> = {
  info: "text-text-muted",
  warn: "text-status-warn",
  error: "text-status-down",
};

export function EventLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div>
      <p className="font-mono text-[11px] tracking-wide text-text-faint uppercase">Event log</p>
      <div className="mt-2 h-48 overflow-y-auto rounded border border-border bg-panel p-2 font-mono text-[11px] leading-relaxed">
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
