import { getTopic, getTopicMinutes, getTopics } from "@/lib/content/queries";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/seo/og-template";
import { siteConfig } from "@/lib/site";
import { pluralize } from "@/lib/utils/format";

export const alt = `A topic on ${siteConfig.name}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Prebuild one card per topic instead of rendering them on request. */
export function generateStaticParams() {
  return getTopics().map((topic) => ({ topic: topic.slug }));
}

export default async function TopicOgImage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic: topicSlug } = await params;
  const topic = getTopic(topicSlug);

  if (!topic) {
    return renderOgCard({ title: siteConfig.name, subtitle: siteConfig.tagline });
  }

  return renderOgCard({
    eyebrow: "Topic",
    title: topic.title,
    subtitle: topic.tagline,
    accent: topic.accent,
    footnote: `${pluralize(topic.lessons.length, "lesson")} · ${getTopicMinutes(topic)} min`,
  });
}
