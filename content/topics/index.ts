import type { Topic } from "@/lib/content/types";

import gitEssentials from "./git-essentials";
import javascriptFoundations from "./javascript-foundations";
import nextjsAppRouter from "./nextjs-app-router";

/**
 * The topic registry — the one place that knows every topic on the site.
 *
 * To add a topic:
 *   1. create `content/topics/<slug>/` with an `index.ts` and `lessons/*.mdx`
 *   2. import it here and add it to the array below
 *
 * Nothing else needs to change: routes, sitemap, search and navigation all
 * derive from this list. See `docs/CONTENT-AUTHORING.md`.
 */
export const topics: readonly Topic[] = [
  javascriptFoundations,
  nextjsAppRouter,
  gitEssentials,
];
