import { defineTopic } from "@/lib/content/types";

import FileBasedRouting from "./lessons/file-based-routing.mdx";
import MetadataAndSeo from "./lessons/metadata-and-seo.mdx";
import ServerAndClientComponents from "./lessons/server-and-client-components.mdx";

export default defineTopic({
  slug: "nextjs-app-router",
  title: "Next.js App Router",
  tagline: "Server-first React, and the conventions that come with it.",
  description:
    "How the App Router actually works: where the server/client boundary belongs, how folders become routes, and how to get metadata, sitemaps and social cards out of the framework instead of writing them by hand.",
  level: "intermediate",
  accent: "indigo",
  icon: "▲",
  order: 2,
  tags: ["next.js", "react", "server components", "routing", "seo"],
  lessons: [
    {
      slug: "server-and-client-components",
      title: "Server and Client Components",
      description:
        "Server is the default and 'use client' is a boundary, not a file marker. Where to draw that boundary, how to pass Server Components through Client ones, and which props can cross.",
      minutes: 8,
      updated: "2026-07-31",
      tags: ["server components", "use client", "bundle size"],
      Content: ServerAndClientComponents,
    },
    {
      slug: "file-based-routing",
      title: "Routing by Folder Structure",
      description:
        "Every special filename in the App Router, what nested layouts preserve, why params is now a Promise, and how route groups let you organise without changing URLs.",
      minutes: 7,
      updated: "2026-07-31",
      tags: ["routing", "layouts", "dynamic segments"],
      Content: FileBasedRouting,
    },
    {
      slug: "metadata-and-seo",
      title: "Metadata, OG Images and SEO",
      description:
        "Title templates, metadataBase, canonical URLs, generateMetadata for data-driven pages, and the four file conventions that generate your favicon, social card, sitemap and robots.txt.",
      minutes: 9,
      updated: "2026-07-31",
      tags: ["seo", "metadata", "open graph", "json-ld"],
      Content: MetadataAndSeo,
    },
  ],
});
