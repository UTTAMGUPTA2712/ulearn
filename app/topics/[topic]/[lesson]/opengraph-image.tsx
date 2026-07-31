import { getAllLessons, getLesson } from "@/lib/content/queries";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/seo/og-template";
import { siteConfig } from "@/lib/site";

export const alt = `A lesson on ${siteConfig.name}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Prebuild one card per lesson. */
export function generateStaticParams() {
  return getAllLessons().map(({ topic, lesson }) => ({
    topic: topic.slug,
    lesson: lesson.slug,
  }));
}

export default async function LessonOgImage({
  params,
}: {
  params: Promise<{ topic: string; lesson: string }>;
}) {
  const { topic: topicSlug, lesson: lessonSlug } = await params;
  const found = getLesson(topicSlug, lessonSlug);

  if (!found) {
    return renderOgCard({ title: siteConfig.name, subtitle: siteConfig.tagline });
  }

  const { topic, lesson } = found;

  return renderOgCard({
    eyebrow: topic.title,
    title: lesson.title,
    subtitle: lesson.description,
    accent: topic.accent,
    footnote: `${lesson.minutes} min read`,
  });
}
