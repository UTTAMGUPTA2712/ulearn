import type { MetadataRoute } from "next";

import { absoluteUrl, siteConfig } from "@/lib/site";

/**
 * Generated at build time. Points crawlers at the sitemap and keeps them out
 * of Next's internal asset paths.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
