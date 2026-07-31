import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

type BuildMetadataOptions = {
  /** Page title without the site suffix — the root layout's template adds it. */
  title: string;
  description: string;
  /** Site-relative path, e.g. `/topics/git-essentials`. Becomes the canonical. */
  path: string;
  /**
   * Open Graph type. `article` unlocks the published/modified time fields and
   * is what lessons should use.
   */
  type?: "website" | "article";
  /** ISO date; only meaningful when `type` is `article`. */
  publishedTime?: string;
  modifiedTime?: string;
  keywords?: readonly string[];
  /**
   * Path to a specific OG image. Omit to let the nearest `opengraph-image`
   * file convention supply one — that is the normal case.
   */
  image?: string;
  /** Set for pages that should exist but never be indexed (e.g. search results). */
  noIndex?: boolean;
};

/**
 * Builds a complete, consistent `Metadata` object for a page.
 *
 * Every route uses this rather than hand-rolling metadata, so canonical URLs,
 * Open Graph and Twitter tags can never drift apart.
 */
export function buildMetadata({
  title,
  description,
  path,
  type = "website",
  publishedTime,
  modifiedTime,
  keywords,
  image,
  noIndex = false,
}: BuildMetadataOptions): Metadata {
  return {
    title,
    description,
    keywords: keywords ? [...keywords] : undefined,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type,
      title,
      description,
      url: path,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      ...(image ? { images: [{ url: image }] } : {}),
      ...(type === "article"
        ? {
            publishedTime,
            modifiedTime,
            authors: [siteConfig.author.name],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: siteConfig.twitterHandle,
      ...(image ? { images: [image] } : {}),
    },
    ...(noIndex
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}
