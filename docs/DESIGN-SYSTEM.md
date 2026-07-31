# Design system

Tailwind CSS v4, configured entirely in `app/globals.css`. There is no
`tailwind.config.js` — v4 uses CSS-first configuration.

## Token layers

Three layers, in order. Only the middle one should appear in markup.

### 1. Palette

Raw ramps: `--color-brand-50` through `--color-brand-900`. Used for the logo,
primary buttons and the hero glow. **Never reference these for text or surfaces**
— they don't adapt to the theme.

### 2. Semantic

What components use. These flip with the theme.

| Token             | Utility            | Use for                              |
| ----------------- | ------------------ | ------------------------------------ |
| `--canvas`        | `bg-canvas`        | Page background                      |
| `--surface`       | `bg-surface`       | Cards, header, footer                |
| `--surface-raised`| `bg-surface-raised`| Elements above a surface             |
| `--ink`           | `text-ink`         | Primary text, headings               |
| `--ink-muted`     | `text-ink-muted`   | Body copy, descriptions              |
| `--ink-subtle`    | `text-ink-subtle`  | Meta, timestamps, labels             |
| `--line`          | `border-line`      | Default borders and dividers         |
| `--line-strong`   | `border-line-strong` | Emphasised borders                 |

Note the naming: `ink` rather than `foreground`, `canvas`/`surface` rather than
`background`. It forces a choice about *what kind* of surface or text you mean.

### 3. Accent

`--accent`, `--accent-soft` and `--accent-ink` resolve from the nearest
`data-accent` ancestor. Defaults to indigo.

```tsx
<div data-accent={topic.accent}>
  {/* everything below is now emerald, amber, whatever the topic uses */}
  <span className="bg-accent-soft text-accent-ink">…</span>
</div>
```

This is why no component contains a per-topic colour conditional.

## Dark mode

Class-based, not media-query-based, so the toggle can override the system
preference:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Both are still respected: the inline script in `<head>` reads `localStorage`
first, falls back to `prefers-color-scheme`, and applies `.dark` before first
paint. See [ARCHITECTURE.md](./ARCHITECTURE.md#theming).

Every accent has a separate dark definition — the light values are too dark and
too saturated against a dark canvas.

## Adding an accent

Two files, and both are required:

1. `lib/content/types.ts` — add the key to `ACCENTS`
2. `app/globals.css` — add a `[data-accent="…"]` rule **and** a
   `.dark [data-accent="…"]` rule

If the accent should also appear on social cards, add its hex to `OG_ACCENTS`
in `lib/seo/og-template.tsx` — that renderer has no access to CSS variables.

## Typography

Geist Sans and Geist Mono via `next/font/google`, with `display: "swap"`.

Application UI uses Tailwind's scale directly. **Lesson bodies use `.prose`**, a
hand-written block in `globals.css` scoped so it can never leak into UI.

`.prose` notes worth knowing:

- `max-width: 68ch` — the reading measure
- `h2` gets a top border, which is what visually separates lesson sections;
  `:first-child` suppresses it
- inline code is tinted with the current accent, so it shifts per topic
- code blocks are fixed dark (`#0d1117`) in both themes — a light code block
  next to dark syntax conventions reads worse than a consistently dark one
- `scroll-margin-top` on headings keeps anchor jumps clear of the sticky header

## Components

Grouped by concern, not by type:

```txt
components/
├─ brand/     Logo, LogoMark
├─ layout/    Container, SiteHeader, SiteFooter, NavLinks, Breadcrumbs
├─ seo/       JsonLd
├─ theme/     ThemeScript, ThemeToggle
├─ topics/    TopicCard, LessonList, LessonPager
└─ ui/        Badge, LevelBadge, PageHeader, Prose
```

`Container` is the only thing that sets horizontal gutters. Three widths:
`prose` (reading), `default`, `wide` (grids and landing sections). Don't add
`px-*` to page sections — use a Container.

## The logo

A lowercase **u** — for Uttam, and for *you* — with a rising spark above its
open stem. The open bowl reads as "still learning"; the spark is the moment it
clicks.

| Asset                        | Use                                       |
| ---------------------------- | ----------------------------------------- |
| `components/brand/logo.tsx`  | In-app. `<Logo />` and `<LogoMark />`     |
| `app/icon.svg`               | Favicon                                   |
| `app/apple-icon.tsx`         | iOS home screen, generated at 180×180     |
| `public/logo.svg`            | Mark + wordmark, for external use         |
| `public/logo-mark.svg`       | Mark alone, for external use              |

The geometry is tuned for legibility at 16px: heavy strokes, round caps, and a
deliberate gap between the stem and the spark so they don't merge at small
sizes. **If you change the geometry, change all four assets** — they are
intentional duplicates (a React component, a static SVG the browser can request
without React, and two public files).

`LogoMark` takes a `gradientId` prop because SVG gradient ids are
document-global. The default is fine while every mark on a page is identical;
pass a unique id if you ever render a recoloured variant alongside it.

## Motion

Minimal and functional:

- `animate-rise` — a subtle 8px entrance on page headers
- 150–200ms colour transitions on interactive elements
- `hover:-translate-y-0.5` on topic cards

All of it is disabled under `prefers-reduced-motion: reduce`, handled globally
in `globals.css` — you don't need to guard individual components.

## Conventions

- Semantic tokens over palette values in markup
- `data-accent` over conditional colour classes
- `Container` over ad-hoc padding
- `cn()` from `lib/utils/cn.ts` for conditional classes. It is deliberately
  dependency-free; if class *conflict* resolution is ever needed, swap in
  `clsx` + `tailwind-merge` there and nothing else changes.
