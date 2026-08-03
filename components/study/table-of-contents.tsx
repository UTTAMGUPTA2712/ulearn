import { slugify } from "@/lib/utils/slugify";

/** Sticky "On this page" nav — pass the exact `title` strings used by each `Section`. */
export function TableOfContents({ sections }: { sections: string[] }) {
  return (
    <nav
      aria-label="On this page"
      className="sticky top-20 hidden w-64 shrink-0 self-start lg:block"
    >
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">
        On this page
      </p>
      <ul className="mt-3 space-y-2.5 border-l border-border pl-4">
        {sections.map((title) => (
          <li key={title}>
            <a
              href={`#${slugify(title)}`}
              className="text-sm leading-snug text-text-muted transition-colors hover:text-accent"
            >
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
