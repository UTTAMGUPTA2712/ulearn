# Content authoring

How to add a topic, write a lesson, and keep the house style consistent.

## Mental model

- A **topic** is a subject: "Git Essentials". It has its own page and its own
  accent colour.
- A **lesson** is one readable sitting inside a topic: 5–10 minutes.
- Lessons are ordered. Later ones may assume earlier ones, but each should still
  make sense alone — people arrive from search, not from lesson one.

## Adding a topic

### 1. Create the folder

```txt
content/topics/your-topic/
├─ index.ts
└─ lessons/
   ├─ first-thing.mdx
   └─ second-thing.mdx
```

The folder name should match the topic `slug`. It becomes the URL.

### 2. Write the lessons

Plain markdown. No frontmatter, no imports, no exports — metadata lives in
`index.ts`.

```mdx
Open with a paragraph that states the point of the lesson. No "In this lesson
we will…" preamble; say the thing.

## First section

Prose, then an example.

```js
const example = "fenced code blocks get syntax-neutral styling";
```

## What to remember

- Four or five lines someone could recall a month later.
```

**Do not write an `# h1`** — the page renders the title from `index.ts`. Start
at `##`.

### 3. Define the topic

```ts
// content/topics/your-topic/index.ts
import { defineTopic } from "@/lib/content/types";

import FirstThing from "./lessons/first-thing.mdx";
import SecondThing from "./lessons/second-thing.mdx";

export default defineTopic({
  slug: "your-topic",
  title: "Your Topic",
  tagline: "One line. Shows on the card.",
  description:
    "Two or three sentences. Shows on the topic page and becomes the meta description, so make it a real description, not a teaser.",
  level: "beginner",
  accent: "sky",
  icon: "🧠",
  order: 4,
  tags: ["topic", "keywords"],
  lessons: [
    {
      slug: "first-thing",
      title: "The First Thing",
      description:
        "One or two sentences. Used on cards, as the meta description, and on the social card.",
      minutes: 6,
      updated: "2026-07-31",
      tags: ["specific", "tags"],
      Content: FirstThing,
    },
    // …
  ],
});
```

### 4. Register it

```ts
// content/topics/index.ts
import yourTopic from "./your-topic";

export const topics: readonly Topic[] = [
  javascriptFoundations,
  nextjsAppRouter,
  gitEssentials,
  yourTopic,
];
```

Done. Run `npm run dev` and the routes exist.

## Field reference

### Topic

| Field         | Notes                                                                 |
| ------------- | --------------------------------------------------------------------- |
| `slug`        | URL segment. Lowercase, hyphenated. Must be unique site-wide.         |
| `title`       | Display name. Title Case.                                             |
| `tagline`     | One line for cards. Aim for under 60 characters.                      |
| `description` | 2–3 sentences. Becomes the `<meta description>` — write it as one.    |
| `level`       | `beginner` \| `intermediate` \| `advanced`                            |
| `accent`      | `indigo` \| `emerald` \| `amber` \| `rose` \| `sky` \| `violet`       |
| `icon`        | A single emoji or glyph.                                              |
| `order`       | Lower sorts first. Leave gaps (10, 20, 30) if you expect reordering.  |
| `tags`        | Lowercase keywords. Surface on the topic page and in JSON-LD.         |

### Lesson

| Field         | Notes                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| `slug`        | URL segment. Unique within the topic.                                  |
| `title`       | The headline. Specific beats clever.                                   |
| `description` | 1–2 sentences. Meta description **and** the social card subtitle.      |
| `minutes`     | Honest reading time. ~200 words per minute, plus time for code.        |
| `updated`     | `YYYY-MM-DD`. Bump on meaningful edits; it drives sitemap freshness and the "Recently updated" list. |
| `tags`        | Optional, lesson-specific.                                             |
| `Content`     | The imported MDX component.                                            |

## Markdown support

Standard markdown plus GitHub-flavoured extensions (`remark-gfm`):

- tables
- strikethrough
- task lists
- autolinked URLs

Headings get automatic ids (`rehype-slug`), so `## What to remember` is
linkable as `#what-to-remember`.

Links: internal (`/topics/…`) go through `next/link` automatically; external
ones open in a new tab with `rel="noopener noreferrer"`. Just write normal
markdown links.

Code blocks are styled but **not syntax-highlighted** — see
[ROADMAP](./ROADMAP.md) if you want that. Still tag the language on the fence;
it will be used when highlighting is added.

## House style

The seed lessons follow these. Matching them keeps the site coherent.

**Explain the model, not the syntax.** Syntax is one search away. The mental
model is what makes the syntax obvious afterwards.

**Open with the point.** No "In this lesson…". The first paragraph should be
useful on its own.

**Show the failure.** The version that looks right, why it looks right, and what
actually happens. Wrong-then-right teaches better than right-only.

**Use real examples.** Code someone might actually write, not `foo`/`bar`.

**Stay short.** Over ten minutes means it is two lessons.

**End with "What to remember".** Four or five bullets, each recallable a month
later. Every seed lesson does this and readers come to expect it.

**Second person, present tense.** "You call the function", not "one would call".

## Before you commit

- [ ] `npm run build` passes
- [ ] The lesson reads correctly at `/topics/<topic>/<lesson>`
- [ ] `description` is a real sentence — it is the search-result snippet
- [ ] `minutes` is honest
- [ ] `updated` is today's date
- [ ] Social card looks right at `/topics/<topic>/<lesson>/opengraph-image`
- [ ] No `# h1` in the MDX
