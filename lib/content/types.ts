import type { ComponentType } from "react";

/** Difficulty ladder shown as a badge on topic and lesson cards. */
export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

/**
 * Accent keys map to the `--color-accent-*` custom properties defined in
 * `app/globals.css`. Adding a new accent means adding it in both places.
 */
export const ACCENTS = ["indigo", "emerald", "amber", "rose", "sky", "violet"] as const;
export type Accent = (typeof ACCENTS)[number];

/**
 * A single lesson. `Content` is the compiled MDX component — the prose lives
 * in an `.mdx` file next to the topic definition, the metadata lives here so
 * it stays typed and queryable without parsing frontmatter.
 */
export interface Lesson {
  /** URL segment, unique within its topic. */
  slug: string;
  title: string;
  /** One or two sentences. Used for cards, `<meta description>` and OG text. */
  description: string;
  /** Realistic reading time in minutes; drives the "x min read" label. */
  minutes: number;
  /** ISO 8601 date (YYYY-MM-DD) of the last meaningful edit. */
  updated: string;
  /** Free-form tags, surfaced on the lesson page and in JSON-LD keywords. */
  tags?: readonly string[];
  /** The compiled MDX body. */
  Content: ComponentType;
}

/** Everything about a topic except its lessons. */
export interface TopicMeta {
  /** URL segment, unique across the site. */
  slug: string;
  title: string;
  /** Short punchy line for cards. */
  tagline: string;
  /** Fuller paragraph for the topic page and metadata. */
  description: string;
  level: Level;
  accent: Accent;
  /** Emoji or short glyph used as the topic's visual mark. */
  icon: string;
  /** Lower numbers sort first on the topics index. */
  order: number;
  tags?: readonly string[];
}

/** A topic together with its ordered lessons. */
export interface Topic extends TopicMeta {
  lessons: readonly Lesson[];
}

/** A lesson plus a back-pointer to the topic that owns it. */
export interface LessonWithTopic {
  topic: Topic;
  lesson: Lesson;
}

/** Previous/next lesson pointers used by the in-lesson pager. */
export interface LessonNeighbours {
  previous: Lesson | null;
  next: Lesson | null;
}

/**
 * Helper used by each topic module. It exists purely so TypeScript checks the
 * shape at the definition site instead of at the registry.
 */
export function defineTopic(topic: Topic): Topic {
  return topic;
}
