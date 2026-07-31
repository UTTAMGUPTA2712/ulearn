# Roadmap

What this base deliberately leaves out, why, and what to build when the reason
stops holding.

## Deliberately not built

### Syntax highlighting

Code blocks are styled but not tokenised. A highlighter is the single biggest
dependency a docs site takes on, and it wasn't needed to prove the content
pipeline works.

**When to add it:** as soon as lessons contain code longer than ~20 lines.

**How:** [Shiki](https://shiki.style) via `rehype-pretty-code`, added to
`rehypePlugins` in `next.config.ts`. Remember the Turbopack constraint —
plugins must be named as strings with serializable options. Highlighting
happens at build time, so it costs no client JavaScript.

### Search

`searchLessons()` exists in `lib/content/queries.ts` and does naive substring
matching over titles, descriptions and tags. Nothing calls it yet — with nine
lessons, the topics page *is* the search.

**When to add it:** past roughly 30 lessons, or the first time you can't find
your own lesson.

**How:** wire `searchLessons()` to a client component with a `⌘K` dialog. Past a
few hundred lessons, replace the implementation with
[FlexSearch](https://github.com/nextapps-de/flexsearch) or
[Pagefind](https://pagefind.app) — the query signature stays the same, so
nothing else changes.

### Table of contents

`rehype-slug` already gives every heading an id, so headings are linkable. What's
missing is the sidebar list.

**How:** add `rehype-toc` or extract headings during the build, and render them
in the existing `<aside>` on the lesson page. Scroll-spy needs a Client
Component with an `IntersectionObserver`.

### Progress tracking

No "mark as complete", no accounts.

**When:** only if people ask. It changes the project's character — accounts mean
a database, sessions, privacy policy and account deletion.

**Cheapest first step:** `localStorage`-backed completion ticks, no server. Gets
most of the value at none of the cost.

### RSS feed

Straightforward and probably worth doing early: `app/feed.xml/route.ts`
returning an RSS document built from `getRecentLessons()`. Same pattern as
`sitemap.ts`.

### Analytics

None installed. When you want it, prefer something privacy-preserving
(Plausible, Umami, Vercel Analytics) and add it to the root layout with
`next/script`.

## Worth doing soon

**Fill in `lib/site.ts`.** `social` and `twitterHandle` are placeholders — bare
domains and a made-up handle. They currently emit useless `sameAs` links in the
Organization schema.

**A real `/about` photo or intro.** The page is written but generic.

**More topics.** The structure is proven by three; the site becomes useful at
ten.

**`engines` in `package.json`.** Pin Node ≥20.9 so CI can't drift onto an
unsupported version.

**A lesson-level "last reviewed" distinct from `updated`.** Useful once content
ages — `updated` means "I edited this", which isn't the same as "I checked this
is still true".

## Explicitly not planned

- **A CMS.** The content is prose in Git. A text editor and a pull request are
  the right tools, and they cost nothing to run.
- **Comments.** Moderation is a permanent job. Issues on the repository handle
  corrections better.
- **Video.** Different medium, different skillset, different hosting bill.
- **Paid tiers.** The homepage promises no paywall. That promise is the point.

## Scaling notes

The current design is comfortable to a few hundred lessons. Beyond that:

- **Build time** grows linearly, dominated by OG image generation. Drop
  `generateStaticParams` from the `opengraph-image.tsx` files to render cards on
  demand instead.
- **`content/topics/index.ts`** gets long. It can be replaced with a glob import
  — but keep the explicit registry as long as you can. Explicit imports are
  type-checked and traceable; globs are neither.
- **Sitemaps** must be split past 50,000 URLs, using Next's `generateSitemaps`.
  That is a very long way away.
