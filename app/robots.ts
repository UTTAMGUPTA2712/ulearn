import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ulearn-it.vercel.app";

/** Generated at build time — restores what the MDX-era `app/robots.ts` did before it was deleted in the course-content cleanup and never brought back, which left crawlers with no sitemap to discover. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
