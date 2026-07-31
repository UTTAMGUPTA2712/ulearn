# Contributing

## Setup

```bash
npm install
npm run dev
```

Node 20.9 or later.

## Before opening a PR

```bash
npm run lint
npx tsc --noEmit
npm run build
```

All three must pass. The build is the real gate — it type-checks, prerenders
every route, and runs the slug-uniqueness validation in
`lib/content/registry.ts`.

## Code conventions

**Server Components by default.** Add `"use client"` only when you need state,
effects, event handlers or browser APIs — and add it to the smallest component
that needs it, not to a page or layout.

**Read content through queries.** Import from `lib/content/queries`, never from
`content/topics` directly. Build URLs with `routes` from `lib/content/paths`,
never by string concatenation.

**Use semantic tokens.** `text-ink-muted`, not `text-zinc-500`. `bg-surface`,
not `bg-white dark:bg-zinc-900`. See
[DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md).

**Comment the why.** The codebase comments non-obvious decisions — why
`suppressHydrationWarning` is on `<html>`, why MDX plugins are strings, why
`OG_ACCENTS` duplicates the CSS values. Don't comment what the code plainly
says.

**Keep dependencies few.** The runtime dependency list is Next, React and the
MDX pipeline. `cn()` is fifteen lines instead of a package for a reason. New
dependencies need a reason beyond convenience.

## Where things go

| Adding…                        | Goes in                                    |
| ------------------------------ | ------------------------------------------ |
| A topic or lesson              | `content/topics/` — see [CONTENT-AUTHORING.md](./CONTENT-AUTHORING.md) |
| A reusable UI element          | `components/ui/`                           |
| Something topic-specific       | `components/topics/`                       |
| A page shell element           | `components/layout/`                       |
| A content query                | `lib/content/queries.ts`                   |
| A new URL                      | `lib/content/paths.ts`, then the route     |
| A JSON-LD type                 | `lib/seo/schema.ts`                        |
| A shared helper                | `lib/utils/`                               |

## Commits

Imperative subject under 72 characters, blank line, then *why*:

```txt
Add search across lesson titles and tags

The catalogue passed twenty lessons, so browsing by topic alone stopped
being enough. Substring matching over the registry is adequate at this
size; swap in a real index past a few hundred.
```

One idea per commit. `git add -p` if the working tree has drifted.

Conventional Commits prefixes (`feat:`, `fix:`, `docs:`) are fine but not
enforced — an unenforced convention applied half the time is worse than none.

There is a lesson on all of this at
`/topics/git-essentials/commits-that-explain-themselves`, which the project
tries to follow.

## Review checklist

- [ ] Lint, types and build pass
- [ ] No new `"use client"` higher in the tree than necessary
- [ ] Colours use semantic tokens
- [ ] New routes export metadata via `buildMetadata()`
- [ ] New pages appear in the sitemap (automatic if derived from the registry)
- [ ] Keyboard-navigable; focus states visible
- [ ] Works in both themes
- [ ] Docs updated if behaviour or conventions changed

## Reporting a content error

Open an issue with the lesson URL and what is wrong. Corrections to the lessons
matter more than features — a wrong explanation is worse than a missing one.
