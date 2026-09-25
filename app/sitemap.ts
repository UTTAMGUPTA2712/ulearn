import { readdirSync } from "node:fs";
import { join } from "node:path";

import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";
import { topics } from "@/lib/topics";


/**
 * Sub-route folders under a topic directory that are real pages, not
 * private helpers — mirrors the `_components`/`_lib` underscore convention
 * every topic already uses. Read from disk instead of hardcoded per topic,
 * so a new tab (e.g. adding `match` to a topic) appears here automatically.
 */
function topicSubRoutes(slug: string): string[] {
  const dir = join(process.cwd(), "app", "topics", slug);
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * Generated at build time — restores what the MDX-era `app/sitemap.ts` did
 * before it was deleted in the course-content cleanup. Only lists
 * `status: "available"` topics; a topic still under construction (built on
 * disk but not flipped on in `lib/topics.ts`) stays out of the index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
  ];

  const topicPages: MetadataRoute.Sitemap = topics
    .filter((topic) => topic.status === "available")
    .flatMap((topic) => {
      const base = `${SITE_URL}/topics/${topic.slug}`;
      return [
        { url: base, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 },
        ...topicSubRoutes(topic.slug).map((sub) => ({
          url: `${base}/${sub}`,
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })),
      ];
    });

  return [...staticPages, ...topicPages];
}
