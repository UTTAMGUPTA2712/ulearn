import type { Metadata } from "next";

import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { TopicCard } from "@/components/topics/topic-card";
import { PageHeader } from "@/components/ui/page-header";
import { routes } from "@/lib/content/paths";
import { getAllTags, getLessonCount, getTopics } from "@/lib/content/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, graph, itemListSchema } from "@/lib/seo/schema";
import { pluralize } from "@/lib/utils/format";

const trail: Crumb[] = [
  { name: "Home", path: routes.home() },
  { name: "Topics", path: routes.topics() },
];

export const metadata: Metadata = buildMetadata({
  title: "All topics",
  description:
    "Every topic on ulearn — JavaScript foundations, the Next.js App Router, Git essentials and more. Short, practical lessons you can read in a sitting.",
  path: routes.topics(),
  keywords: ["programming topics", "web development lessons", "free tutorials"],
});

export default function TopicsPage() {
  const topics = getTopics();
  const tags = getAllTags();

  return (
    <>
      <JsonLd schema={graph(itemListSchema(topics), breadcrumbSchema(trail))} />

      <Container width="wide" className="py-12 sm:py-16">
        <Breadcrumbs trail={trail} />

        <PageHeader
          className="mt-6"
          eyebrow="Catalogue"
          title="Everything on ulearn"
          description={`${pluralize(topics.length, "topic")} and ${pluralize(
            getLessonCount(),
            "lesson",
          )}. Each topic stands on its own — there's no prescribed order and nothing is locked.`}
        >
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        </PageHeader>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <TopicCard key={topic.slug} topic={topic} />
          ))}
        </div>
      </Container>
    </>
  );
}
