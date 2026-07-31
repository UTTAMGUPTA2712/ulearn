import Link from "next/link";

import { routes } from "@/lib/content/paths";
import type { Lesson } from "@/lib/content/types";
import { cn } from "@/lib/utils/cn";

type LessonListProps = {
  topicSlug: string;
  lessons: readonly Lesson[];
  /** Slug of the lesson currently being read, if any — highlighted in place. */
  currentSlug?: string;
  /** Drops descriptions — used by the narrow in-lesson sidebar. */
  compact?: boolean;
};

/** Numbered lesson index. Used on the topic page and the in-lesson sidebar. */
export function LessonList({
  topicSlug,
  lessons,
  currentSlug,
  compact = false,
}: LessonListProps) {
  return (
    <ol className="flex flex-col gap-2">
      {lessons.map((lesson, index) => {
        const isCurrent = lesson.slug === currentSlug;

        return (
          <li key={lesson.slug}>
            <Link
              href={routes.lesson(topicSlug, lesson.slug)}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "group flex gap-4 rounded-xl border transition-colors",
                compact ? "p-3" : "p-4",
                isCurrent
                  ? "border-accent/40 bg-accent-soft"
                  : "border-line bg-surface hover:border-line-strong hover:bg-canvas",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums",
                  isCurrent
                    ? "bg-accent text-white"
                    : "bg-canvas text-ink-subtle group-hover:bg-surface",
                )}
              >
                {index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block font-medium text-ink",
                    compact && "text-sm leading-snug",
                  )}
                >
                  {lesson.title}
                </span>
                {!compact && (
                  <span className="mt-1 block text-sm leading-relaxed text-ink-muted">
                    {lesson.description}
                  </span>
                )}
                <span
                  className={cn("block text-xs text-ink-subtle", compact ? "mt-1" : "mt-2")}
                >
                  {lesson.minutes} min read
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
