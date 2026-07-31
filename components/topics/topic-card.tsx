import Link from "next/link";

import { Badge, LevelBadge } from "@/components/ui/badge";
import { routes } from "@/lib/content/paths";
import { getTopicMinutes } from "@/lib/content/queries";
import type { Topic } from "@/lib/content/types";
import { cn } from "@/lib/utils/cn";

/**
 * Topic tile for the homepage and topics index.
 *
 * `data-accent` retints every accent-aware descendant, so the card needs no
 * per-topic conditional classes.
 */
export function TopicCard({ topic, className }: { topic: Topic; className?: string }) {
  const minutes = getTopicMinutes(topic);

  return (
    <Link
      href={routes.topic(topic.slug)}
      data-accent={topic.accent}
      className={cn(
        "group relative flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-6",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xl text-accent-ink"
        >
          {topic.icon}
        </span>
        <LevelBadge level={topic.level} />
      </div>

      <h3 className="mt-5 text-lg font-semibold tracking-tight text-ink">
        {topic.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{topic.tagline}</p>

      <div className="mt-auto flex items-center gap-2 pt-6 text-xs text-ink-subtle">
        <Badge variant="accent">
          {topic.lessons.length} {topic.lessons.length === 1 ? "lesson" : "lessons"}
        </Badge>
        <span>·</span>
        <span>{minutes} min total</span>
        <span
          aria-hidden="true"
          className="ml-auto text-accent transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      </div>
    </Link>
  );
}
