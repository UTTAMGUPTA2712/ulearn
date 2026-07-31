import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

/** Web app manifest — makes the site installable and themes the mobile chrome. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0b10",
    theme_color: siteConfig.themeColor,
    lang: siteConfig.lang,
    categories: ["education", "productivity", "developer tools"],
    icons: [
      {
        src: "/logo-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
