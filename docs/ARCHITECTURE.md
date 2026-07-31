# Architecture

The whole design follows one rule: **content is data, and everything else is
derived from it.** Routes, navigation, the sitemap, social cards and structured
data are all projections of a single registry. Adding a lesson touches one
place.

## The layers

```txt
content/topics/**        Source of truth — MDX prose + typed metadata
        ↓
lib/content/             registry → queries → typed reads
        ↓
app/**                   Routes ask queries for what they need
components/**            Presentation only; no content knowledge
lib/seo/                 Derives metadata, JSON-LD and OG cards from the same data
```

Dependencies only ever point downward. `components/` never imports from
`app/`; `lib/content/` never imports from `components/`.

## The content layer

### `lib/content/types.ts`

Defines `Topic`, `Lesson`, `Level` and `Accent`, plus `defineTopic()` — an
identity function whose only job is to type-check a topic at its definition
site, so an error points at the topic file rather than at the registry.

A `Lesson` carries its metadata (slug, title, description, minutes, updated,
tags) *and* a `Content` field holding the compiled MDX component. Metadata lives
in TypeScript rather than MDX frontmatter deliberately:

- it is type-checked, so a missing `description` fails the build
- it is queryable without parsing anything
- `remark-frontmatter` is not needed, which keeps the Turbopack plugin config to
  serializable strings

### `content/topics/index.ts`

The registry: one array, one import per topic. This is the only file that knows
the full set. Everything else calls a query.

### `lib/content/registry.ts`

Sorts topics by `order`, then title, and **validates uniqueness** of topic and
lesson slugs at module load. A duplicate slug throws during `next build` rather
than silently shadowing a route.

### `lib/content/queries.ts`

The read API. Routes never touch the registry directly:

| Query                    | Returns                                    |
| ------------------------ | ------------------------------------------ |
| `getTopics()`            | All topics, sorted                         |
| `getTopic(slug)`         | One topic or `undefined`                   |
| `getLesson(t, l)`        | `{ topic, lesson }` or `undefined`         |
| `getAllLessons()`        | Flat list, used by `generateStaticParams`  |
| `getLessonNeighbours()`  | Previous/next for the pager                |
| `getRecentLessons(n)`    | Newest by `updated`                        |
| `getTopicMinutes()`      | Summed reading time                        |
| `getAllTags()`           | Distinct tags across everything            |
| `searchLessons(q)`       | Naive substring search                     |

`searchLessons` is intentionally simple — see [ROADMAP](./ROADMAP.md) for when
to replace it.

### `lib/content/paths.ts`

Every URL the site can produce, as functions. Nothing constructs a content URL
by string concatenation, so changing `/topics/…` to `/learn/…` is a one-file
change.

## Rendering model

Every page is a **Server Component** and every route is **statically
prerendered**. `next build` emits 35 static outputs — pages, OG images,
sitemap, robots and manifest.

Dynamic routes use `generateStaticParams` plus `export const dynamicParams =
false`. Because the content set is fully known at build time, an unknown slug is
a genuine 404 rather than an on-demand render.

### The client boundary

Only two components carry `"use client"`:

| Component            | Why                                           |
| -------------------- | --------------------------------------------- |
| `NavLinks`           | Needs `usePathname()` for the active link      |
| `ThemeToggle`        | Reads and writes the DOM and `localStorage`    |
| `app/error.tsx`      | Error boundaries must be client components     |

`SiteHeader` is a Server Component that *renders* those two — the boundary sits
as low in the tree as it can. Keep it that way when adding interactivity.

`ThemeToggle` uses `useSyncExternalStore` over a `MutationObserver` on
`<html class>` rather than mirroring the theme into React state. The DOM class
is the single source of truth, so the toggle cannot drift from the applied
theme, and there is no `setState`-in-effect cascade.

## Theming

`components/theme/theme-script.tsx` renders a small blocking script in `<head>`
that applies the stored or system theme **before first paint**. This has to be
blocking — any React-driven approach flashes the wrong theme. It is also why
`<html>` carries `suppressHydrationWarning`.

Per-topic accents work through a `data-accent` attribute rather than
conditional class names. A topic page sets `data-accent={topic.accent}` on its
root, and every descendant using `bg-accent-soft`, `text-accent` etc. retints
automatically. Adding an accent means adding it in two places:
`ACCENTS` in `lib/content/types.ts` and the `[data-accent="…"]` rules in
`app/globals.css`.

## MDX pipeline

`next.config.ts` wires `@next/mdx` with:

- `remark-gfm` — tables, strikethrough, task lists
- `rehype-slug` — heading ids, so lesson headings are linkable

Both are declared **as strings**, not imported functions: Turbopack passes
plugin config to Rust, and functions cannot cross that boundary.

`pageExtensions` is restricted to `["ts", "tsx"]` so an `.mdx` file can never
accidentally become a route. Lessons are imported as components, always.

`mdx-components.tsx` (required at the project root) overrides only `a`, routing
internal links through `next/link` and giving external ones
`rel="noopener noreferrer"`. All other styling is CSS — the `.prose` block in
`globals.css` — so lesson MDX stays plain markdown with no imports.

## SEO layer

Covered fully in [SEO.md](./SEO.md). Structurally:

- `lib/seo/metadata.ts` — one `buildMetadata()` used by every route, so
  canonical, Open Graph and Twitter tags cannot drift apart
- `lib/seo/schema.ts` — pure JSON-LD builders returning plain objects
- `lib/seo/og-template.tsx` — one `renderOgCard()` shared by all three
  `opengraph-image.tsx` files
- `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts` — generated from the
  registry

## Why no database

The content is a few dozen documents that change when someone writes prose. A
build step is the correct granularity: pages are static files, hosting is free,
there is nothing to secure, and the "CMS" is a text editor and Git.

If the site ever needs user accounts or progress tracking, that is a genuinely
different application — see [ROADMAP](./ROADMAP.md).
