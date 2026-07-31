/**
 * Every URL the content system can produce. Routes, breadcrumbs, sitemap and
 * links all build paths through these helpers so a routing change is a
 * one-file change.
 */

export const routes = {
  home: () => "/",
  topics: () => "/topics",
  topic: (topicSlug: string) => `/topics/${topicSlug}`,
  lesson: (topicSlug: string, lessonSlug: string) =>
    `/topics/${topicSlug}/${lessonSlug}`,
  about: () => "/about",
} as const;
