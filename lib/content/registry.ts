import { topics as rawTopics } from "@/content/topics";
import type { Topic } from "./types";

/**
 * All topics, sorted by their `order` field and then alphabetically so the
 * ordering is stable even if two topics share an `order`.
 *
 * Every read of the content set goes through here, which keeps the sort in
 * exactly one place.
 */
export const allTopics: readonly Topic[] = [...rawTopics].sort(
  (a, b) => a.order - b.order || a.title.localeCompare(b.title),
);

assertUniqueSlugs(allTopics);

/**
 * Fails the build (rather than shipping a broken route) if two topics or two
 * lessons within a topic claim the same slug.
 */
function assertUniqueSlugs(topics: readonly Topic[]): void {
  const seenTopics = new Set<string>();

  for (const topic of topics) {
    if (seenTopics.has(topic.slug)) {
      throw new Error(`Duplicate topic slug: "${topic.slug}"`);
    }
    seenTopics.add(topic.slug);

    const seenLessons = new Set<string>();
    for (const lesson of topic.lessons) {
      if (seenLessons.has(lesson.slug)) {
        throw new Error(
          `Duplicate lesson slug "${lesson.slug}" in topic "${topic.slug}"`,
        );
      }
      seenLessons.add(lesson.slug);
    }
  }
}
