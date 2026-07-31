# SEO

Everything search- and share-related, and where it lives.

## Principles

1. **One builder.** Every route's metadata comes from `buildMetadata()`, so
   canonical, Open Graph and Twitter tags can never drift apart.
2. **Derived, not maintained.** The sitemap, robots and social cards are
   generated from the content registry. There is no list to keep in sync.
3. **Static.** Every page is prerendered, so crawlers get complete HTML with no
   JavaScript execution required.

## Metadata

### Root (`app/layout.tsx`)

Sets what everything inherits:

- `metadataBase` — makes relative canonical and OG paths resolvable. Without
  it, a relative OG image is a build error.
- `title.template` — `"%s · ulearn"`, so pages supply only their bare title
- default description, keywords, author, publisher, locale
- `robots` including `max-image-preview: large` (required for large thumbnails
  in Google results)
- optional `google-site-verification` from `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`

`viewport` exports the light/dark `themeColor` pair separately — in the App
Router `themeColor` belongs in `viewport`, not `metadata`.

### Pages

```ts
export const metadata: Metadata = buildMetadata({
  title: "All topics",
  description: "…",
  path: routes.topics(),
});
```

For data-driven routes, the same builder inside `generateMetadata`:

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic: topicSlug } = await params;
  const topic = getTopic(topicSlug);
  if (!topic) return {};

  return buildMetadata({
    title: topic.title,
    description: topic.description,
    path: routes.topic(topic.slug),
    keywords: topic.tags,
  });
}
```

Lessons pass `type: "article"` plus `publishedTime`/`modifiedTime`.

### Canonicals

Every indexable page declares one, via the `path` argument. Without canonicals,
`?ref=twitter`, a trailing slash and a differently-cased path look like three
competing pages.

## Structured data

`lib/seo/schema.ts` holds pure builders; `<JsonLd />` serialises them, escaping
`<` so a string in the data cannot close the script tag early.

| Builder                | Emitted on          | Type                        |
| ---------------------- | ------------------- | --------------------------- |
| `organizationSchema()` | Every page (layout) | `Organization`              |
| `websiteSchema()`      | Homepage            | `WebSite`                   |
| `itemListSchema()`     | `/topics`           | `ItemList`                  |
| `courseSchema()`       | Topic pages         | `Course` + `CourseInstance` |
| `lessonSchema()`       | Lesson pages        | `LearningResource`+`Article`|
| `breadcrumbSchema()`   | Every subpage       | `BreadcrumbList`            |

Nodes are combined into one `@graph` per page by `graph(...)`. A single graph
lets nodes reference each other by `@id` — a lesson points at its course, a
course points at the organisation — instead of repeating the same data.

`courseSchema` includes `hasCourseInstance` because Google requires it for
course rich results.

Pass the same `trail` array to `<Breadcrumbs />` and `breadcrumbSchema()` so the
visible trail and the structured data cannot disagree.

## Social cards

`lib/seo/og-template.tsx` exports `renderOgCard()`. All three
`opengraph-image.tsx` files delegate to it, so every card shares one layout and
only the text and accent change.

| Route                             | Card                                    |
| --------------------------------- | --------------------------------------- |
| `app/opengraph-image.tsx`         | Site default — tagline and totals       |
| `app/topics/[topic]/…`            | Topic name, tagline, lesson count       |
| `app/topics/[topic]/[lesson]/…`   | Topic eyebrow, lesson title, description|

The dynamic ones export `generateStaticParams`, so cards are PNGs built at
build time rather than rendered per request.

### Working with `ImageResponse`

It renders via satori, which supports **flexbox and a subset of CSS only**:

- no CSS grid
- any element with more than one child needs an explicit `display: "flex"`
- `filter` is unsupported — the accent glow is a `radial-gradient`, because a
  blurred circle would render with a hard edge
- no CSS custom properties, which is why `OG_ACCENTS` duplicates the accent
  hexes from `globals.css`. **Keep those two lists in sync.**

Preview a card by opening its route directly, e.g.
`/topics/git-essentials/opengraph-image`.

## Generated files

| File                | Route                  | Notes                                        |
| ------------------- | ---------------------- | -------------------------------------------- |
| `app/sitemap.ts`    | `/sitemap.xml`         | Static pages + every topic + every lesson    |
| `app/robots.ts`     | `/robots.txt`          | Allows all, blocks `/api/` and `/_next/`     |
| `app/manifest.ts`   | `/manifest.webmanifest`| PWA metadata, theme colour, icons            |
| `app/icon.svg`      | `/icon.svg`            | Favicon                                      |
| `app/apple-icon.tsx`| `/apple-icon`          | 180×180 PNG for iOS home screens             |

Sitemap `lastModified` comes from each lesson's `updated` field, so freshness
signals are real rather than "everything changed at build time".

## Accessibility (which is also SEO)

- One `<h1>` per page
- Skip-to-content link, first in the DOM
- `aria-current="page"` on active nav and lesson links
- `aria-label` on the theme toggle, which has no visible text
- Semantic landmarks: `header`, `main`, `footer`, `nav`, `article`, `aside`
- Visible `:focus-visible` outline using the accent colour
- `prefers-reduced-motion` honoured globally in `globals.css`

## Launch checklist

- [ ] `NEXT_PUBLIC_SITE_URL` set to the real origin, no trailing slash
- [ ] `siteConfig.social` and `twitterHandle` updated in `lib/site.ts` — the
      placeholders are bare domains and will emit useless `sameAs` links
- [ ] `/robots.txt` shows the production host
- [ ] `/sitemap.xml` lists every page with absolute production URLs
- [ ] Cards render at `/opengraph-image` and one topic/lesson variant
- [ ] Validate a lesson page at <https://validator.schema.org>
- [ ] Preview a share at <https://cards-dev.twitter.com/validator> and
      <https://developers.facebook.com/tools/debug/>
- [ ] Submit the sitemap in Google Search Console
- [ ] Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` if verifying by meta tag
- [ ] Lighthouse SEO and Accessibility at 100

## Deliberately not included

- **No `og:image` per page in `buildMetadata`.** The file convention resolves
  the nearest `opengraph-image` automatically; setting it manually would
  override that and is easier to get wrong.
- **No `FAQPage` or `HowTo` schema.** Google restricted both to a narrow set of
  sites; adding them now is noise.
- **No `keywords` meta on lessons beyond tags.** Search engines ignore it; it is
  emitted only because it costs nothing and some internal tools read it.
