# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — dev server (Turbopack) at http://localhost:3000
- `npm run build` — production build; the fastest full check that every route still prerenders
- `npm run lint` — ESLint (flat config, `eslint-config-next`)
- `npx tsc --noEmit` — typecheck only

There is no test suite.

## What this is

ulearn is a Next.js 16 / React 19 / Tailwind v4 site of **interactive system-design simulations** (load balancer, rate limiter, message queue, …). Every page is static; the only server-side data fetch is `/blog`, which pulls a Medium feed (`lib/blog.ts`, key in `MEDIUM_RSS2JSON_API_KEY`, server-only).

**The README is partly stale.** It describes an MDX content layer (`content/topics/`, `defineTopic`, `lib/content/`, `lib/seo/`) and several `docs/*.md` files that no longer exist. Only `docs/DESIGN-SYSTEM.md` exists. Trust the code, not the README's "Adding a topic" section.

## Architecture

**Topic registry — `lib/topics.ts`.** A flat list of `{slug, title, tagline, category, status}` used by the home page cards and `app/sitemap.ts`. It's a build queue (shipped + a few planned), not a backlog; the wider backlog lives in README.md. A topic can exist on disk while still `status: "planned"`. Flipping it to `"available"` is what links it from the home page and adds it to the sitemap.

**Each topic is a hand-built route under `app/topics/<slug>/`**, following the same shape:

- `layout.tsx` — sets metadata, renders the header plus `TopicTabs` with the topic's own tab list (Simulate / Study / Glossary, and sometimes extras like `match`)
- `page.tsx` — the Simulate tab, which renders `_components/simulation.tsx`
- `study/page.tsx`, `glossary/page.tsx` — sibling tabs
- `_lib/engine.ts` — a plain mutable TS class holding all simulation state. It exposes `tick(deltaMs)`, action methods and `getSnapshot()`
- `_lib/use-simulation.ts` — a client hook that owns one engine instance, drives `tick` on a `requestAnimationFrame` loop (delta clamped so backgrounded tabs don't jump) and pushes `getSnapshot()` into React state. The engine deliberately lives outside React; see the load-balancer hook's comments for why
- `_lib/types.ts`, `_lib/glossary.ts` (the `GlossaryEntry[]` read by both `Term` popovers and the Glossary tab), `_components/diagram.tsx`, `controls.tsx`

Underscore folders are private. `app/sitemap.ts` discovers a topic's sub-routes by reading non-underscore directories on disk, so a new tab folder shows up in the sitemap automatically.

**Shared UI in `components/`** is topic-agnostic and should be reused, not forked per topic: `simulation/` (Button, StatsBar, EventLog), `study/` (Section, ConceptCard, ComparisonTable, TableOfContents, Term), `topic/topic-tabs.tsx`, `ui/status-dot.tsx`. Only the business logic that wires them up belongs in the topic folder.

**Theming.** Colors are CSS variables in `app/globals.css`, mapped into Tailwind via `@theme inline` (`bg-panel`, `text-text-muted`, `border-border-strong`, `status-up/warn/down/active`, `accent`…). Use those tokens, not raw Tailwind palette colors. Dark/light is set on `<html data-theme>` before hydration by `themeInitScript()` in `lib/theme.ts`, which is injected as a `beforeInteractive` script in `app/layout.tsx`.

## Design system

`docs/DESIGN-SYSTEM.md` is the source of truth for visual and component conventions. Read it before building or restyling UI, especially §10 (core components and how a topic should use them), §11–12 (motion, reduced motion, accessibility) and §14 (the checklist for adding a new topic).

## Environment

See `.env.example`. `NEXT_PUBLIC_SITE_URL` is the canonical origin for metadata, sitemap and robots, and it falls back to `https://ulearn-it.vercel.app`.
