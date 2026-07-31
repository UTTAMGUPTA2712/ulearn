import Link from "next/link";

import { routes } from "@/lib/content/paths";
import type { LessonNeighbours } from "@/lib/content/types";

type LessonPagerProps = LessonNeighbours & {
  topicSlug: string;
};

/** Previous/next links at the foot of a lesson. */
export function LessonPager({ previous, next, topicSlug }: LessonPagerProps) {
  if (!previous && !next) return null;

  return (
    <nav
      aria-label="Lesson navigation"
      className="mt-16 grid gap-3 border-t border-line pt-8 sm:grid-cols-2"
    >
      {previous ? (
        <PagerLink
          href={routes.lesson(topicSlug, previous.slug)}
          direction="previous"
          title={previous.title}
        />
      ) : (
        <span aria-hidden="true" />
      )}

      {next && (
        <PagerLink
          href={routes.lesson(topicSlug, next.slug)}
          direction="next"
          title={next.title}
        />
      )}
    </nav>
  );
}

function PagerLink({
  href,
  direction,
  title,
}: {
  href: string;
  direction: "previous" | "next";
  title: string;
}) {
  const isNext = direction === "next";

  return (
    <Link
      href={href}
      rel={isNext ? "next" : "prev"}
      className={`group flex flex-col gap-1 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-canvas ${
        isNext ? "text-right sm:col-start-2" : ""
      }`}
    >
      <span className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
        {isNext ? "Next" : "Previous"}
      </span>
      <span className="font-medium text-ink group-hover:text-accent">
        {isNext ? `${title} →` : `← ${title}`}
      </span>
    </Link>
  );
}
