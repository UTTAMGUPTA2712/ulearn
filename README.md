<div align="center">
  <img src="./app/icon.svg" width="72" alt="ulearn" />
  <h1>ulearn</h1>
  <p><strong>Learn it once. Explain it forever.</strong></p>
  <p>An open learning platform where every topic gets its own space.</p>
</div>

---

**ulearn** is a statically generated learning site. Each subject is a *topic*;
each topic holds a short sequence of *lessons* written in MDX. Adding a topic is
a folder, a config file and one line in a registry — routes, navigation,
sitemap, social cards and structured data all follow automatically.

The name is `u` for **U**ttam and `u` for **you**.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional for local dev
npm run dev                  # http://localhost:3000
```

| Script          | Does                                          |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Dev server with Turbopack and hot reload      |
| `npm run build` | Production build; prerenders every page       |
| `npm start`     | Serve the production build                    |
| `npm run lint`  | ESLint                                        |

Set `NEXT_PUBLIC_SITE_URL` before deploying — canonical URLs, the sitemap,
`robots.txt` and Open Graph image URLs are all built from it. See
[`.env.example`](./.env.example).

## Adding a topic

Three steps, in full:

```txt
content/topics/
└─ your-topic/
   ├─ index.ts               ← metadata + lesson list
   └─ lessons/
      └─ first-lesson.mdx    ← the prose
```

```ts
// content/topics/your-topic/index.ts
import { defineTopic } from "@/lib/content/types";
import FirstLesson from "./lessons/first-lesson.mdx";

export default defineTopic({
  slug: "your-topic",
  title: "Your Topic",
  tagline: "One line for the card.",
  description: "A paragraph for the topic page and meta description.",
  level: "beginner",
  accent: "sky",
  icon: "🧠",
  order: 4,
  tags: ["something"],
  lessons: [
    {
      slug: "first-lesson",
      title: "First Lesson",
      description: "One or two sentences, used for cards and SEO.",
      minutes: 6,
      updated: "2026-07-31",
      Content: FirstLesson,
    },
  ],
});
```

```ts
// content/topics/index.ts — register it
import yourTopic from "./your-topic";

export const topics: readonly Topic[] = [/* … */, yourTopic];
```

That's it. `/topics/your-topic` and `/topics/your-topic/first-lesson` now exist,
are prerendered, are in the sitemap, and have their own generated social card.

Full guide: [`docs/CONTENT-AUTHORING.md`](./docs/CONTENT-AUTHORING.md).

## Topics roadmap

Four simulations are live today, four more are queued next in
[`lib/topics.ts`](./lib/topics.ts). Beyond those, here's the backlog —
names only, unsorted by priority:

- **Traffic & Routing** — Socket.IO, CDN & Edge Caching
- **Resilience** — Distributed Locks
- **Async & Messaging** — Resilient Message Handling, Change Data Capture & Outbox
- **Data & Caching** — Redis Protocol, Database Replication, Database Sharding, Bloom Filter, Merkle Trees
- **Databases** — SQL vs NoSQL, Database Indexing, ACID & Isolation Levels, Row vs Column Storage
- **Consistency & Consensus** — CAP Theorem, 2PC vs Saga, Gossip Protocol, Quorum Reads & Writes
- **Observability** — Distributed Tracing
- **AI & Machine Learning** — How LLMs Generate Text, Vector Search & ANN Indexes, LLM Inference & KV Cache
- **Compute & Concurrency** — Concurrency vs Parallelism vs Multithreading vs Multiprocessing, Autoscaling
- **Auth & Access** — RBAC
- **Architecture** — Multi-Tenancy, Blue-Green & Canary Deployments

## Documentation

| Document                                              | Covers                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| [Architecture](./docs/ARCHITECTURE.md)                 | Directory layout, the content layer, rendering model           |
| [Content authoring](./docs/CONTENT-AUTHORING.md)       | Writing topics and lessons, MDX conventions, the house style   |
| [Design system](./docs/DESIGN-SYSTEM.md)               | Tokens, theming, per-topic accents, the logo                   |
| [SEO](./docs/SEO.md)                                   | Metadata, canonicals, JSON-LD, OG images, launch checklist     |
| [Deployment](./docs/DEPLOYMENT.md)                     | Environment variables, hosting, post-deploy verification       |
| [Contributing](./docs/CONTRIBUTING.md)                 | Conventions, commit style, review checklist                    |
| [Roadmap](./docs/ROADMAP.md)                           | What's deliberately not built yet, and what to build next      |

## Stack

- **[Next.js 16](https://nextjs.org)** — App Router, React Server Components, Turbopack
- **[React 19](https://react.dev)**
- **[Tailwind CSS v4](https://tailwindcss.com)** — CSS-first config, no `tailwind.config.js`
- **[MDX](https://mdxjs.com)** via `@next/mdx` — lesson bodies
- **TypeScript** in strict mode

Every route is static. There is no database, no API, and no client-side data
fetching — the whole site is HTML and a small amount of JavaScript.

## Project layout

```txt
app/                    Routes and metadata files (sitemap, robots, OG images)
components/             UI, grouped by concern (brand, layout, topics, ui, seo, theme)
content/topics/         The lessons themselves — MDX plus per-topic config
lib/
  content/              Types, registry, queries, route helpers
  seo/                  Metadata builder, JSON-LD schemas, OG card template
  utils/                Small shared helpers
docs/                   The documentation listed above
```

## Licence

Code is MIT. Lesson content is free to read and share — attribution
appreciated.
