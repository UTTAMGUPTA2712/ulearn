import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { routes } from "@/lib/content/paths";
import { getTopics } from "@/lib/content/queries";

/**
 * Rendered for unmatched routes and by `notFound()`.
 *
 * Rather than a dead end, it offers the topic list — the most likely thing a
 * visitor on a broken URL was looking for.
 */
export default function NotFound() {
  const topics = getTopics();

  return (
    <Container width="prose" className="py-24 text-center">
      <LogoMark className="mx-auto h-12 w-12" />

      <p className="mt-8 text-sm font-semibold tracking-[0.14em] text-accent uppercase">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        That page isn&apos;t here
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-muted">
        The link may be out of date, or the lesson may have been renamed. Here is
        everything that does exist.
      </p>

      <ul className="mx-auto mt-10 flex max-w-md flex-col gap-2 text-left">
        {topics.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={routes.topic(topic.slug)}
              data-accent={topic.accent}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-accent/40"
            >
              <span aria-hidden="true" className="text-lg">
                {topic.icon}
              </span>
              <span className="font-medium text-ink">{topic.title}</span>
              <span aria-hidden="true" className="ml-auto text-accent">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={routes.home()}
        className="mt-10 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Back to the homepage
      </Link>
    </Container>
  );
}
