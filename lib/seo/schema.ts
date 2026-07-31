import { routes } from "@/lib/content/paths";
import { getTopicMinutes } from "@/lib/content/queries";
import type { Lesson, Topic } from "@/lib/content/types";
import { absoluteUrl, siteConfig } from "@/lib/site";

/**
 * JSON-LD builders.
 *
 * Each function returns a plain object; `<JsonLd />` serialises it. Keeping
 * them pure means they can be unit-tested and validated against
 * https://validator.schema.org without rendering a page.
 */

type Schema = Record<string, unknown>;

/** Stable @id for the publishing organisation, referenced by other nodes. */
const organizationId = `${siteConfig.url}/#organization`;
const websiteId = `${siteConfig.url}/#website`;

export function organizationSchema(): Schema {
  return {
    "@type": "Organization",
    "@id": organizationId,
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo-mark.svg"),
      width: 40,
      height: 40,
    },
    sameAs: Object.values(siteConfig.social),
    founder: {
      "@type": "Person",
      name: siteConfig.author.name,
    },
  };
}

/** Site-level node. Include on the homepage only. */
export function websiteSchema(): Schema {
  return {
    "@type": "WebSite",
    "@id": websiteId,
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    inLanguage: siteConfig.lang,
    publisher: { "@id": organizationId },
  };
}

/** A topic is a course made up of lesson-sized units. */
export function courseSchema(topic: Topic): Schema {
  return {
    "@type": "Course",
    "@id": absoluteUrl(routes.topic(topic.slug)) + "#course",
    name: topic.title,
    description: topic.description,
    url: absoluteUrl(routes.topic(topic.slug)),
    inLanguage: siteConfig.lang,
    educationalLevel: topic.level,
    keywords: topic.tags?.join(", "),
    provider: { "@id": organizationId },
    isAccessibleForFree: true,
    // Google requires at least one `hasCourseInstance` for course rich results.
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${getTopicMinutes(topic)}M`,
    },
    hasPart: topic.lessons.map((lesson) => ({
      "@type": "LearningResource",
      name: lesson.title,
      url: absoluteUrl(routes.lesson(topic.slug, lesson.slug)),
    })),
  };
}

/** A lesson is both an article and a learning resource. */
export function lessonSchema(topic: Topic, lesson: Lesson): Schema {
  const url = absoluteUrl(routes.lesson(topic.slug, lesson.slug));

  return {
    "@type": ["LearningResource", "Article"],
    "@id": `${url}#lesson`,
    name: lesson.title,
    headline: lesson.title,
    description: lesson.description,
    url,
    inLanguage: siteConfig.lang,
    learningResourceType: "lesson",
    educationalLevel: topic.level,
    timeRequired: `PT${lesson.minutes}M`,
    keywords: [...(lesson.tags ?? []), ...(topic.tags ?? [])].join(", "),
    dateModified: lesson.updated,
    datePublished: lesson.updated,
    isPartOf: {
      "@id": absoluteUrl(routes.topic(topic.slug)) + "#course",
    },
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
    },
    publisher: { "@id": organizationId },
    isAccessibleForFree: true,
  };
}

/** Trail of `{ name, path }` pairs, root first. */
export function breadcrumbSchema(
  trail: readonly { name: string; path: string }[],
): Schema {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** An ordered list of topics, used on the topics index. */
export function itemListSchema(topics: readonly Topic[]): Schema {
  return {
    "@type": "ItemList",
    itemListElement: topics.map((topic, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: topic.title,
      url: absoluteUrl(routes.topic(topic.slug)),
    })),
  };
}

/**
 * Wraps one or more nodes into a single `@graph` document.
 *
 * One script tag with a graph is preferred over several separate scripts —
 * it lets nodes reference each other by `@id` without duplication.
 */
export function graph(...nodes: Schema[]): Schema {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
