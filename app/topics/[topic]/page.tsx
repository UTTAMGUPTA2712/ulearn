import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { LessonList } from "@/components/topics/lesson-list";
import { Badge, LevelBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { routes } from "@/lib/content/paths";
import { getTopic, getTopicMinutes, getTopics } from "@/lib/content/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, courseSchema, graph } from "@/lib/seo/schema";
import { pluralize } from "@/lib/utils/format";

type Props = {
  params: Promise<{ topic: string }>;
};

/** Prerender every topic at build time. */
export function generateStaticParams() {
  return getTopics().map((topic) => ({ topic: topic.slug }));
}

/** The content set is fully known, so anything else is a genuine 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic: topicSlug } = await params;
  const topic = getTopic(topicSlug);

  if (!topic) return {};

  return buildMetadata({
    title: topic.title,
    description: topic.description,
    path: routes.topic(topic.slug),
    keywords: topic.tags,
  });
}

export default async function TopicPage({ params }: Props) {
  const { topic: topicSlug } = await params;
  const topic = getTopic(topicSlug);

  if (!topic) notFound();

  const trail: Crumb[] = [
    { name: "Home", path: routes.home() },
    { name: "Topics", path: routes.topics() },
    { name: topic.title, path: routes.topic(topic.slug) },
  ];

  return (
    <div data-accent={topic.accent}>
      <JsonLd schema={graph(courseSchema(topic), breadcrumbSchema(trail))} />

      <Container className="py-12 sm:py-16">
        <Breadcrumbs trail={trail} />

        <div className="mt-6 flex items-start gap-5">
          <span
            aria-hidden="true"
            className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-3xl text-accent-ink sm:flex"
          >
            {topic.icon}
          </span>

          <PageHeader
            eyebrow="Topic"
            title={topic.title}
            description={topic.description}
          >
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge level={topic.level} />
              <Badge variant="accent">
                {pluralize(topic.lessons.length, "lesson")}
              </Badge>
              <Badge>{getTopicMinutes(topic)} min total</Badge>
            </div>
          </PageHeader>
        </div>

        <section className="mt-12">
          <h2 className="text-sm font-semibold tracking-wider text-ink-subtle uppercase">
            Lessons
          </h2>
          <div className="mt-4">
            <LessonList topicSlug={topic.slug} lessons={topic.lessons} />
          </div>
        </section>

        {topic.tags && topic.tags.length > 0 && (
          <section className="mt-12 border-t border-line pt-8">
            <h2 className="text-sm font-semibold tracking-wider text-ink-subtle uppercase">
              Covered here
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {topic.tags.map((tag) => (
                <li key={tag}>
                  <Badge>{tag}</Badge>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </div>
  );
}
