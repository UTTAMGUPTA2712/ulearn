import type { MetadataRoute } from "next";

import { routes } from "@/lib/content/paths";
import { getTopicUpdated, getTopics } from "@/lib/content/queries";
import { absoluteUrl } from "@/lib/site";

/**
 * Derived entirely from the content registry, so a new topic or lesson appears
 * in the sitemap the moment it is registered — there is nothing to remember to
 * update here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const topics = getTopics();
  const buildDate = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(routes.home()),
      lastModified: buildDate,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl(routes.topics()),
      lastModified: buildDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl(routes.about()),
      lastModified: buildDate,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  const topicPages: MetadataRoute.Sitemap = topics.map((topic) => ({
    url: absoluteUrl(routes.topic(topic.slug)),
    lastModified: getTopicUpdated(topic) ?? buildDate,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const lessonPages: MetadataRoute.Sitemap = topics.flatMap((topic) =>
    topic.lessons.map((lesson) => ({
      url: absoluteUrl(routes.lesson(topic.slug, lesson.slug)),
      lastModified: lesson.updated,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );

  return [...staticPages, ...topicPages, ...lessonPages];
}
