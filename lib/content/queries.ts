import { allTopics } from "./registry";
import type { Lesson, LessonNeighbours, LessonWithTopic, Topic } from "./types";

/** Every topic, already sorted. */
export function getTopics(): readonly Topic[] {
  return allTopics;
}

/** A single topic, or `undefined` when the slug is unknown. */
export function getTopic(topicSlug: string): Topic | undefined {
  return allTopics.find((topic) => topic.slug === topicSlug);
}

/** A lesson together with its parent topic, or `undefined` if either is unknown. */
export function getLesson(
  topicSlug: string,
  lessonSlug: string,
): LessonWithTopic | undefined {
  const topic = getTopic(topicSlug);
  const lesson = topic?.lessons.find((item) => item.slug === lessonSlug);

  return topic && lesson ? { topic, lesson } : undefined;
}

/** Flat list of every lesson on the site, in topic then lesson order. */
export function getAllLessons(): readonly LessonWithTopic[] {
  return allTopics.flatMap((topic) =>
    topic.lessons.map((lesson) => ({ topic, lesson })),
  );
}

/** The lessons immediately before and after `lessonSlug` within its topic. */
export function getLessonNeighbours(
  topic: Topic,
  lessonSlug: string,
): LessonNeighbours {
  const index = topic.lessons.findIndex((lesson) => lesson.slug === lessonSlug);

  if (index === -1) return { previous: null, next: null };

  return {
    previous: topic.lessons[index - 1] ?? null,
    next: topic.lessons[index + 1] ?? null,
  };
}

/** Total lesson count across all topics — used for the homepage stats. */
export function getLessonCount(): number {
  return allTopics.reduce((total, topic) => total + topic.lessons.length, 0);
}

/** Combined reading time of a topic, in minutes. */
export function getTopicMinutes(topic: Topic): number {
  return topic.lessons.reduce((total, lesson) => total + lesson.minutes, 0);
}

/** Most recently updated lessons first — powers the "Latest" section. */
export function getRecentLessons(limit = 6): readonly LessonWithTopic[] {
  return [...getAllLessons()]
    .sort((a, b) => b.lesson.updated.localeCompare(a.lesson.updated))
    .slice(0, limit);
}

/** The newest `updated` date across a topic's lessons, for sitemap freshness. */
export function getTopicUpdated(topic: Topic): string | undefined {
  return topic.lessons
    .map((lesson) => lesson.updated)
    .sort((a, b) => b.localeCompare(a))[0];
}

/** Every distinct tag used across topics and lessons, sorted alphabetically. */
export function getAllTags(): readonly string[] {
  const tags = new Set<string>();

  for (const topic of allTopics) {
    topic.tags?.forEach((tag) => tags.add(tag));
    for (const lesson of topic.lessons) {
      lesson.tags?.forEach((tag) => tags.add(tag));
    }
  }

  return [...tags].sort((a, b) => a.localeCompare(b));
}

/**
 * Naive substring search over titles, descriptions and tags.
 *
 * Good enough for a few dozen lessons; swap the body for a real index
 * (FlexSearch, Pagefind, Algolia) once the catalogue outgrows it.
 */
export function searchLessons(query: string): readonly LessonWithTopic[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  return getAllLessons().filter(({ topic, lesson }) =>
    haystack(topic, lesson).includes(needle),
  );
}

function haystack(topic: Topic, lesson: Lesson): string {
  return [
    lesson.title,
    lesson.description,
    topic.title,
    ...(lesson.tags ?? []),
    ...(topic.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
}
