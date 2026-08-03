import { slugify } from "@/lib/utils/slugify";

/**
 * A stacked section on a study page. `id` is derived from `title` via
 * `slugify` so `TableOfContents` can link straight to it — keep titles
 * unique within a page.
 */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      id={slugify(title)}
      className="scroll-mt-20 border-t border-border pt-6 first:border-t-0 first:pt-0"
    >
      <h2 className="text-xs font-semibold tracking-wide text-accent uppercase">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-text-muted">{children}</div>
    </section>
  );
}
