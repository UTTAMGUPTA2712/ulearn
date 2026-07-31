import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/seo/og-template";
import { getLessonCount, getTopics } from "@/lib/content/queries";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Default social card, inherited by any route without its own. */
export default function OpengraphImage() {
  return renderOgCard({
    title: siteConfig.tagline,
    subtitle: siteConfig.description,
    footnote: `${getTopics().length} topics · ${getLessonCount()} lessons`,
  });
}
