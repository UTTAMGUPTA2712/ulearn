import Link from "next/link";

import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { TopicCard } from "@/components/topics/topic-card";
import { Badge } from "@/components/ui/badge";
import { routes } from "@/lib/content/paths";
import {
  getLessonCount,
  getRecentLessons,
  getTopics,
} from "@/lib/content/queries";
import { graph, websiteSchema } from "@/lib/seo/schema";
import { siteConfig } from "@/lib/site";
import { formatDate } from "@/lib/utils/format";

export default function HomePage() {
  const topics = getTopics();
  const lessonCount = getLessonCount();
  const recent = getRecentLessons(4);
  const totalMinutes = topics.reduce(
    (sum, topic) => sum + topic.lessons.reduce((t, l) => t + l.minutes, 0),
    0,
  );

  return (
    <>
      <JsonLd schema={graph(websiteSchema())} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-brand-500/12 blur-3xl"
        />
        <Container width="wide" className="relative py-20 sm:py-28">
          <div className="max-w-3xl animate-rise">
            <Badge variant="accent">Free · No account required</Badge>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-ink sm:text-6xl">
              {siteConfig.tagline}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-ink-muted sm:text-xl">
              {`${siteConfig.name} is where I write down what I've learned properly — one topic per space, short lessons, no filler, and no “subscribe to continue”.`}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={routes.topics()}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Browse all topics
              </Link>
              <Link
                href={routes.about()}
                className="rounded-xl border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface"
              >
                What is this?
              </Link>
            </div>

            <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
              <Stat label="Topics" value={topics.length} />
              <Stat label="Lessons" value={lessonCount} />
              <Stat label="Minutes of reading" value={totalMinutes} />
            </dl>
          </div>
        </Container>
      </section>

      {/* Topics */}
      <section className="py-20">
        <Container width="wide">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                Start with a topic
              </h2>
              <p className="mt-2 text-ink-muted">
                Each one is self-contained. Read them in any order.
              </p>
            </div>
            <Link
              href={routes.topics()}
              className="text-sm font-medium text-accent hover:underline"
            >
              See all {topics.length} →
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} />
            ))}
          </div>
        </Container>
      </section>

      {/* Recently updated */}
      <section className="border-t border-line bg-surface py-20">
        <Container width="wide">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Recently updated
          </h2>
          <p className="mt-2 text-ink-muted">
            The lessons that changed most recently.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {recent.map(({ topic, lesson }) => (
              <li key={`${topic.slug}/${lesson.slug}`}>
                <Link
                  href={routes.lesson(topic.slug, lesson.slug)}
                  data-accent={topic.accent}
                  className="group flex h-full flex-col rounded-xl border border-line bg-canvas p-5 transition-colors hover:border-accent/40"
                >
                  <span className="text-xs font-medium tracking-wide text-accent uppercase">
                    {topic.title}
                  </span>
                  <span className="mt-2 font-medium text-ink group-hover:text-accent">
                    {lesson.title}
                  </span>
                  <span className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                    {lesson.description}
                  </span>
                  <span className="mt-3 text-xs text-ink-subtle">
                    {lesson.minutes} min read · updated{" "}
                    <time dateTime={lesson.updated}>{formatDate(lesson.updated)}</time>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wider text-ink-subtle uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
