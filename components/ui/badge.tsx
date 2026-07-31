import type { ReactNode } from "react";

import type { Level } from "@/lib/content/types";
import { cn } from "@/lib/utils/cn";

type BadgeProps = {
  children: ReactNode;
  className?: string;
  /**
   * `accent` inherits the nearest `data-accent` subtree, so a badge inside a
   * topic card automatically picks up that topic's colour.
   */
  variant?: "neutral" | "accent" | "outline";
};

const variants = {
  neutral: "bg-canvas text-ink-muted border-line",
  accent: "bg-accent-soft text-accent-ink border-transparent",
  outline: "bg-transparent text-ink-muted border-line-strong",
} as const;

export function Badge({ children, className, variant = "neutral" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

const levelLabels: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** Difficulty badge with a filled-dot meter, so level reads at a glance. */
export function LevelBadge({ level, className }: { level: Level; className?: string }) {
  const filled = level === "beginner" ? 1 : level === "intermediate" ? 2 : 3;

  return (
    <Badge variant="outline" className={className}>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn(
              "block h-1.5 w-1.5 rounded-full",
              index < filled ? "bg-accent" : "bg-line-strong",
            )}
          />
        ))}
      </span>
      {levelLabels[level]}
    </Badge>
  );
}
