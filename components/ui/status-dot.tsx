import { cn } from "@/lib/utils/cn";

type Status = "up" | "warn" | "down" | "active" | "idle";

const colors: Record<Status, string> = {
  up: "bg-status-up",
  warn: "bg-status-warn",
  down: "bg-status-down",
  active: "bg-status-active",
  idle: "bg-text-faint",
};

/** Small filled dot used for backend/request/topic status everywhere. */
export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", colors[status], className)}
    />
  );
}
