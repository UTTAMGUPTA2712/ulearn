import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { LessonList } from "@/components/topics/lesson-list";
import { LessonPager } from "@/components/topics/lesson-pager";
import { Badge } from "@/components/ui/badge";
import { Prose } from "@/components/ui/prose";
import { routes } from "@/lib/content/paths";
import {
  getAllLessons,
  getLesson,
  getLessonNeighbours,
} from "@/lib/content/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, graph, lessonSchema } from "@/lib/seo/schema";
import { formatDate } from "@/lib/utils/format";

type Props = {
  params: Promise<{ topic: string; lesson: string }>;
};

/** Prerender every lesson across every topic. */
export function generateStaticParams() {
  return getAllLessons().map(({ topic, lesson }) => ({
    topic: topic.slug,
    lesson: lesson.slug,
  }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic: topicSlug, lesson: lessonSlug } = await params;
  const found = getLesson(topicSlug, lessonSlug);

  if (!found) return {};

  const { topic, lesson } = found;

  return buildMetadata({
    title: lesson.title,
    description: lesson.description,
    path: routes.lesson(topic.slug, lesson.slug),
    type: "article",
    publishedTime: lesson.updated,
    modifiedTime: lesson.updated,
    keywords: [...(lesson.tags ?? []), ...(topic.tags ?? [])],
  });
}

export default async function LessonPage({ params }: Props) {
  const { topic: topicSlug, lesson: lessonSlug } = await params;
  const found = getLesson(topicSlug, lessonSlug);

  if (!found) notFound();

  const { topic, lesson } = found;
  const { previous, next } = getLessonNeighbours(topic, lesson.slug);
  const position = topic.lessons.findIndex((item) => item.slug === lesson.slug) + 1;

  const trail: Crumb[] = [
    { name: "Home", path: routes.home() },
    { name: "Topics", path: routes.topics() },
    { name: topic.title, path: routes.topic(topic.slug) },
    { name: lesson.title, path: routes.lesson(topic.slug, lesson.slug) },
  ];

  return (
    <div data-accent={topic.accent}>
      <JsonLd schema={graph(lessonSchema(topic, lesson), breadcrumbSchema(trail))} />

      <Container width="wide" className="py-12 sm:py-16">
        <Breadcrumbs trail={trail} />

        <div className="mt-8 gap-14 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem]">
          {/* Article */}
          <article className="min-w-0">
            <header className="animate-rise">
              <Link
                href={routes.topic(topic.slug)}
                className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
              >
                <span aria-hidden="true">{topic.icon}</span>
                {topic.title}
              </Link>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
                {lesson.title}
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-pretty text-ink-muted">
                {lesson.description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-subtle">
                <span>
                  Lesson {position} of {topic.lessons.length}
                </span>
                <span aria-hidden="true">·</span>
                <span>{lesson.minutes} min read</span>
                <span aria-hidden="true">·</span>
                <span>
                  Updated{" "}
                  <time dateTime={lesson.updated}>{formatDate(lesson.updated)}</time>
                </span>
              </div>
            </header>

            <hr className="my-10 border-line" />

            <Prose>
              <lesson.Content />
            </Prose>

            {lesson.tags && lesson.tags.length > 0 && (
              <ul className="mt-12 flex flex-wrap gap-2">
                {lesson.tags.map((tag) => (
                  <li key={tag}>
                    <Badge>{tag}</Badge>
                  </li>
                ))}
              </ul>
            )}

            <LessonPager previous={previous} next={next} topicSlug={topic.slug} />
          </article>

          {/* Topic sidebar */}
          <aside className="mt-16 lg:mt-0">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-xs font-semibold tracking-wider text-ink-subtle uppercase">
                In this topic
              </h2>
              <div className="mt-4">
                <LessonList
                  topicSlug={topic.slug}
                  lessons={topic.lessons}
                  currentSlug={lesson.slug}
                  compact
                />
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
