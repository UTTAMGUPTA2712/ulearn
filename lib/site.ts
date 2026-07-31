/**
 * Single source of truth for site-wide identity, navigation and social links.
 *
 * Anything that appears in more than one place (header, footer, metadata,
 * JSON-LD, manifest, sitemap) should be read from here rather than hardcoded.
 */

export const siteConfig = {
  name: "ulearn",
  /** Used where the brand needs to be spelled out, e.g. OG images. */
  legalName: "ulearn",
  tagline: "Learn it once. Explain it forever.",
  description:
    "ulearn is an open learning platform where every topic gets its own space — short, practical lessons on programming and web development, written to be understood the first time.",
  /** Falls back to localhost so `next build` works without any env setup. */
  url: normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  locale: "en_US",
  /** Two-letter language used on <html lang>. */
  lang: "en",
  author: {
    name: "Uttam Gupta",
    url: "https://github.com/",
  },
  /** Shown in the footer and used for JSON-LD `sameAs`. */
  social: {
    github: "https://github.com/",
    x: "https://x.com/",
    linkedin: "https://www.linkedin.com/",
  },
  /** Twitter/X handle used by the `twitter:` card tags. Include the `@`. */
  twitterHandle: "@ulearn",
  /** Brand colour, mirrored by `--color-brand-600` in `app/globals.css`. */
  themeColor: "#4f46e5",
  keywords: [
    "learning platform",
    "programming tutorials",
    "web development",
    "javascript",
    "react",
    "next.js",
    "free courses",
  ],
} as const;

/** Primary navigation, rendered by the header and repeated in the footer. */
export const mainNav = [
  { href: "/", label: "Home" },
  { href: "/topics", label: "Topics" },
  { href: "/about", label: "About" },
] as const;

export type SiteConfig = typeof siteConfig;

/** Strips a trailing slash so URL joins never produce a double slash. */
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Builds an absolute URL from a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
