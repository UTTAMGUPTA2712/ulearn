# ulearn — Design System

This document is the design contract for ulearn. It exists so that every
screen, component and line of copy we add reads like it came from the same
hand — and so that hand looks like it belongs to a senior engineer building a
tool for other senior engineers, not a marketing team building a SaaS landing
page.

Read this before styling anything. If a change isn't traceable back to a
principle here, it's a signal the system needs updating — not an excuse to
freelance.

---

## 1. Who this is for, and why that dictates the design

ulearn teaches systems-design topics — load balancing, circuit breakers,
consistent hashing, message queues — to people who already know how to code
and are past the tutorial stage. The audience is a senior or staff engineer
prepping for a system-design interview, or a mid-level engineer trying to
close the gap to senior. They've used Grafana, Datadog, a terminal, a
Kubernetes dashboard. They're not impressed by decoration; they're impressed
by precision.

That audience and that content type is the entire design brief:

- **This is an instrument, not a brochure.** Every page's job is to make a
  running system legible — traffic flowing, backends failing, a hash ring
  rebalancing. The chrome exists to disappear in favor of the diagram.
- **Credibility comes from restraint, not polish-for-polish's-sake.** A
  senior engineer trusts a page that looks like `htop` or a Grafana panel
  more than one that looks like a startup's Series A landing page. Confidence
  is signaled by *not* trying to sell anything.
- **The reader is here to build a correct mental model.** Typography and
  layout should support close reading and comparison (tables, side-by-side
  states, before/after), not skimming.

If a proposed change would look at home on a consumer ed-tech marketing site
(Coursera, Udemy, a "Learn X in 30 Days" course-selling page), it's wrong for
this product, no matter how attractive it looks in isolation.

---

## 2. What we are explicitly not building

Name the anti-pattern so it's easy to catch in review. **None of the
following belong in ulearn:**

- Purple-to-pink (or blue-to-purple) gradient hero backgrounds, gradient
  text, or gradient buttons.
- Glassmorphism — frosted, semi-transparent panels with blurred backdrops
  used decoratively rather than functionally.
- Floating blobs, mesh gradients, or abstract 3D illustrated shapes used as
  hero-section filler.
- Oversized rounded corners on everything (`rounded-3xl` soup) — softness
  used as the *only* visual idea.
- Generic stock "diverse people looking at laptops" photography, or AI-image
  illustrations of robots/brains/lightbulbs.
- Emoji used as primary iconography in headings or nav (a topic's own emoji
  in a data field is fine — see §8 — plastering 🚀✨💡 through prose is not).
- Centered, oversized "Welcome to the Future of Learning™" hero copy with a
  single vague CTA button.
- Card grids where every card has an icon-in-a-colored-circle, a bold title,
  and three lines of marketing copy — the "SaaS feature grid" template.
- Light, airy, low-contrast pastel palettes designed to look "friendly."
- Sans-serif-everywhere with no monospace — losing the technical register
  that signals "built by and for engineers."
- Skeuomorphic drop shadows, glossy buttons, or heavy elevation — this is a
  flat, dark instrument panel, not a physical object.

If you catch yourself reaching for any of these because "that's what modern
sites look like," stop — that's precisely the register we're avoiding.
Modern AI-generated UI defaults to decoration because it has no content to
be honest about. We have content. Be honest about it instead.

---

## 3. Design principles

1. **Two themes, one instrument.** Dark and light are both first-class — a
   reader on a bright office monitor at 2pm shouldn't have to fight the UI
   any more than someone running the simulations at night. Defaults to the
   OS-level `prefers-color-scheme`, with a manual override the reader can
   flip and that persists. Switching theme changes *only* the token values
   in §4 — layout, density, component shape and copy are identical in both.
   A component that only "works" in one theme is a bug, not a variant.
2. **The diagram is the hero, not a screenshot of one.** Simulations,
   traffic graphs and state machines are real, running UI — never a static
   image standing in for the product.
3. **Monospace is a signal, not a default.** Use it for anything that is
   *data*: numbers, statuses, identifiers, code, commands, timestamps,
   labels on charts. Use the sans body font for anything that is *prose*:
   explanations, lesson text, descriptions. Mixing the two deliberately is
   what makes the UI read as technical rather than decorative.
3. **Terminal-adjacent, not terminal-cosplay.** Command-line motifs (`$
   ulearn --list-topics`) are a seasoning, used at entry points to set tone.
   They are not the whole meal — we don't fake an entire fictional CLI
   session on every page.
4. **One accent color, used sparingly.** A red (`--accent`) marks
   interactivity and the single most important number on a screen. If
   everything is accented, nothing is. This is the brand's one hue outside
   the neutral canvas — no blues, purples or greens anywhere in chrome,
   buttons, links or highlights.
5. **Status color means one thing, everywhere — and `--accent` is not a
   status color.** Green/amber/red/blue map to healthy/warning/down/in-flight
   in every simulation, every table, every badge, with no exceptions and no
   reuse for unrelated meanings. `status-up` stays green: it is the one
   deliberate exception to rule 4's "no green," because "healthy = green" is
   a convention practitioners read faster than they read a legend, and
   inventing a replacement would cost clarity for no real gain. Everywhere
   else — brand, links, buttons, emphasis — green does not appear.
   `--accent` (brand red) and `status-down` (alert red) are deliberately
   *different* reds (see §4) so "click this" and "this failed" never look
   like the same signal.
6. **Density over whitespace-for-its-own-sake.** Dashboards for practitioners
   are allowed to be dense — see §10. Generous whitespace is for prose
   reading columns, not for control panels.
7. **Motion explains state changes, not the brand.** Animation exists to
   show a request moving from client to backend, a circuit breaker flipping
   state, a ring rebalancing. It never exists as a decorative flourish on
   scroll.

---

## 4. Color

The palette is deliberately narrow: a near-neutral canvas, two panel
elevations, one brand accent (red), and four status colors reused
everywhere. Both themes share the same *structure* — the same token names,
the same relationships between them — and differ only in value. Implement
both sets as CSS custom properties in `app/globals.css`, switched by a
`data-theme` attribute on `<html>` (see §7); treat the tables below as
their spec.

The neutrals in both themes carry a faint warm cast — a "skin tint" rather
than a clinical, blue-tinted gray — so they sit naturally next to the red
accent instead of fighting it. It should read as warm and considered, not
pink: keep the tint subtle enough that `--bg` and `--panel` still read as
"black" / "off-white" at a glance.

### Dark theme (default when the OS prefers dark)

| Token             | Value     | Use                                                             |
| ------------------ | --------- | ---------------------------------------------------------------- |
| `--bg`             | `#0e0b0a` | Page canvas — warm near-black, not blue-black                    |
| `--panel`          | `#181211` | Cards, nav bar, default raised surface                          |
| `--panel-raised`   | `#1f1614` | A surface raised *above* a panel (table headers, active tab)     |
| `--border`         | `#2e2320` | Default hairline border                                          |
| `--border-strong`  | `#40312c` | Hover / focus-adjacent border, emphasis dividers                 |
| `--text`           | `#eee6e3` | Primary text                                                     |
| `--text-muted`     | `#a3928c` | Secondary text, descriptions, body copy inside cards              |
| `--text-faint`     | `#6d5c56` | Tertiary — labels, timestamps, disabled state                    |
| `--accent`         | `#fb5145` | Interactive elements, the one number that matters, active state  |
| `--accent-dim`     | `#7f2018` | Accent at rest / secondary accent use                            |
| `--status-up`      | `#34d399` | Healthy, success, passing (the one sanctioned green — see §3.5)  |
| `--status-warn`    | `#fbbf24` | Degraded, slow, retrying                                         |
| `--status-down`    | `#e0342a` | Failed, rejected, dead — a *different* red from `--accent`       |
| `--status-active`  | `#60a5fa` | In-flight / currently processing                                 |

### Light theme (default when the OS prefers light)

| Token             | Value     | Use                                                             |
| ------------------ | --------- | ---------------------------------------------------------------- |
| `--bg`             | `#faf3f0` | Page canvas — warm ivory, not stark white                        |
| `--panel`          | `#fffbf9` | Cards, nav bar, default raised surface                          |
| `--panel-raised`   | `#f5e6e1` | A surface raised *above* a panel (table headers, active tab)     |
| `--border`         | `#e8d6d0` | Default hairline border                                          |
| `--border-strong`  | `#d5bab1` | Hover / focus-adjacent border, emphasis dividers                 |
| `--text`           | `#271815` | Primary text                                                     |
| `--text-muted`     | `#6e5750` | Secondary text, descriptions, body copy inside cards              |
| `--text-faint`     | `#9c847c` | Tertiary — labels, timestamps, disabled state                    |
| `--accent`         | `#b3241b` | Interactive elements, the one number that matters, active state  |
| `--accent-dim`     | `#f2d3cd` | Accent at rest / secondary accent use (soft red-tint chip fill)  |
| `--status-up`      | `#0a8f5b` | Healthy, success, passing (darkened for AA on a light canvas)    |
| `--status-warn`    | `#a15c07` | Degraded, slow, retrying                                         |
| `--status-down`    | `#b31c12` | Failed, rejected, dead — a *different* red from `--accent`       |
| `--status-active`  | `#1d4ed8` | In-flight / currently processing                                 |

**Rules:**

- Never introduce a new hue outside these tables without a documented
  reason. Per-topic "accent" values (see §8) are the one sanctioned
  exception, and even those are drawn from a fixed, pre-approved set — not
  chosen freely per page.
- No green outside `--status-up`. Not in a button, not in a link, not in a
  hover state, not in a decorative highlight. If a design calls for a
  second positive-feeling color, reach for the accent red or a neutral, not
  green.
- `--accent` and `--status-down` are both reds and must stay visibly
  different reds (compare the hex pairs above — accent leans warmer/more
  coral, status-down leans more saturated/alarm) so "this is clickable" and
  "this failed" are never the same signal. Never substitute one for the
  other even though they're in the same family.
- Status colors are semantic, not decorative. `status-down` must always mean
  "this thing failed," never reused as a generic "important" or
  "destructive-button" red distinct from that meaning — a destructive
  action (e.g. "Kill" a backend) *is* a failure-adjacent action, so reusing
  `status-down` there is correct, not a second meaning.
- Contrast floor: body text on `--panel` must clear WCAG AA (4.5:1) **in
  both themes independently** — don't assume a pair that passes in dark
  mode passes in light mode with inverted lightness; verify each.
- No gradients as a background treatment, in either theme. The one place a
  subtle gradient is permitted is a *data* encoding (e.g. a heat gradient on
  a load graph) — never on a hero, a card, or a button.
- Set `color-scheme: dark` / `color-scheme: light` alongside the theme
  attribute so native form controls, scrollbars, etc. match automatically.

---

## 5. Typography

Two typefaces, both from the Geist family already wired up via
`next/font`: **Geist Sans** for prose and UI labels, **Geist Mono** for
everything that is data, code, or terminal-flavored copy.

| Role                          | Font        | Size / weight                          |
| ------------------------------ | ----------- | ---------------------------------------- |
| Page title (H1)                | Sans        | `text-2xl sm:text-3xl`, `font-semibold`, tight tracking |
| Section heading (H2)           | Mono        | `text-xs`, uppercase, tracked, `--accent` |
| Card title                     | Sans        | `text-base`, `font-medium`               |
| Body / lesson prose            | Sans        | `text-sm`, `leading-relaxed`, `--text-muted` |
| Data label (stat name, badge)  | Mono        | `text-[11px]`, uppercase, `--text-faint` |
| Data value (stat number)       | Mono        | `text-sm`–`text-lg`, `font-semibold`     |
| Inline code / commands         | Mono        | `text-sm`, `--text` on `--panel-raised`  |

**Rules:**

- A page's H1 is always sans. A page's section labels (the small
  uppercase mono tag above a heading — see the study page's `Section`
  component) are always mono. Don't swap these.
- Never center large blocks of body prose. Left-align, `max-w-3xl` or
  tighter for reading columns — this is a technical reading experience, not
  a poster.
- Line length for prose: aim for 60–75 characters per line
  (`max-w-prose`/`max-w-3xl` territory). Wider than that and dense
  systems-design explanations get hard to track line-to-line.
- No display/decorative webfonts, ever. If it isn't Geist Sans or Geist
  Mono, it doesn't belong on this site.

---

## 6. Spacing, radius, elevation

- **Spacing scale:** stick to Tailwind's default scale (`1`, `1.5`, `2`,
  `3`, `4`, `5`, `6`, `8`, `10`, `14`...). Don't invent arbitrary pixel
  values.
- **Radius:** `rounded` (4px) for chips/badges/inline elements, `rounded-lg`
  (8px) for cards and panels. Nothing rounder than that — no pill buttons,
  no `rounded-2xl`/`rounded-3xl`. Sharp-ish corners read as instrument, not
  toy.
- **Elevation is a border, not a shadow.** Surfaces are distinguished by
  `--panel` vs `--panel-raised` background and a 1px `--border`, not by
  drop shadow. The only shadow in the system is the subtle one under the
  sticky top nav, and even that should stay close to invisible
  (`backdrop-blur` + a hairline border does most of the work already).
- **Density:** default card padding `p-4`–`p-5`. Don't pad dashboard/control
  surfaces like marketing cards (`p-8`+) — that wastes vertical space a
  practitioner would rather spend on data.

---

## 7. Theme switching

- **Default follows the OS.** On first visit, read `prefers-color-scheme`
  and render that theme — don't default to dark (or light) regardless of
  system setting.
- **Manual override persists.** A reader can flip the toggle; store the
  choice (e.g. `localStorage`) and it wins over the OS setting on every
  later visit until they clear it or flip it again.
- **Mechanism:** a `data-theme="dark" | "light"` attribute on `<html>`,
  set before first paint (inline script or equivalent) to avoid a
  flash-of-wrong-theme. `app/globals.css` defines both token sets from §4
  under `[data-theme="dark"]` / `[data-theme="light"]` selectors (or
  `:root` + an override class — whichever `@theme inline` in Tailwind v4
  makes cheapest) and nothing else needs to change per-theme, because every
  component is already built on the custom-property tokens rather than
  hard-coded colors.
- **The toggle itself stays in house style.** Not a generic sun/moon icon
  pair with a sliding pill animation — that's the one piece of "AI SaaS"
  furniture that would sneak this exact anti-pattern back in through the
  side door (see §2). Use a small mono control consistent with the rest of
  the chrome: e.g. bracketed text (`[dark]` / `[light]`) or a single-glyph
  toggle next to the nav links in `TopNav`, `text-xs` mono, muted at rest,
  `--text` on hover/active — the same visual register as the `topics` nav
  link beside it, not a separate "settings widget" style.
- **No theme-crossfade choreography.** Switching themes swaps token values;
  a brief `transition-colors` (see §11) on background/border/text is enough.
  Don't build a special animated transition just for the toggle moment.
- **Both themes ship simulation-ready.** Status dots, event-log severity
  colors, and any simulation-specific styling must be re-checked against
  the light table in §4, not just eyeballed — a status color tuned for
  contrast on `#0e0b0a` will not automatically read correctly on `#faf3f0`.

---

## 8. The background canvas and per-topic accent

The dot-grid background (`radial-gradient(var(--border) 1px, transparent
1px)` at `24px 24px`) is the one ambient texture in the system, present in
both themes with `--border` doing the adapting. It reads as "engineering
canvas / blueprint grid," reinforcing that every topic is a diagram surface.
Keep it subtle — it's a hint, not a pattern. Don't add a second background
texture anywhere.

Each topic may carry a small identity: an accent hue for its own pages and a
single emoji used only in the topic's own card/nav context (never inline in
prose). This is the one place a broader color vocabulary and a literal emoji
are allowed, and it should stay restrained — a topic accent shifts a border
or a small set of interactive elements on *its own* pages; it never
overrides the global `--accent` red used for site-wide interactive chrome
(nav, primary links). Per-topic accents still may not use green (§3.5).

---

## 9. Voice and content style

Copy is part of the design system — a dashboard that looks restrained but
reads like ad copy breaks the illusion immediately.

- **Direct, technical, second person where it helps ("watch what actually
  happens"), never hype-driven.** No "unlock," "supercharge," "revolutionize,"
  "game-changing," "in just minutes."
- **Show, don't sell.** "Every topic below is a running simulation, not a
  page of prose" is the house voice: a factual claim the reader can verify
  immediately, not an adjective-stacked pitch.
- **Terminal flourishes are single-use, at entry points.** A `$ ulearn
  --list-topics`-style line works once per page, near the top, as a tonal
  anchor. Don't scatter fake shell prompts throughout body copy.
- **Precision over enthusiasm in labels.** "available" / "planned," not
  "Coming Soon! 🎉". Status language matches the status-dot system in §4.
- **Explanations earn their length.** Systems-design nuance (e.g. why IP
  hash reshuffles on failure) needs real paragraphs — don't compress
  correctness into a marketing-style bullet fragment. Density in prose is
  fine; vagueness is not.

---

## 10. Core components (patterns already in use — keep extensions consistent with these)

- **Top nav** — sticky, `h-14`, `--panel`/`bg-bg/90` + blur, hairline bottom
  border, wordmark is a monospace `u` mark plus `ulearn/<section>`. Nav
  links are mono, muted, brighten on hover. Keep navigation minimal — this
  is not a site with a mega-menu.
- **Topic card** — `panel` surface, hairline border that brightens on hover
  (`border-strong`), a mono category eyebrow + status dot up top, sans title,
  muted sans tagline, mono "open simulation →" affordance that appears on
  hover/focus. Unavailable topics are the same shape at `opacity-60` with an
  "idle" dot and no link — never hide planned content, show it as inert.
- **Stat bar** — inline mono label/value pairs, colored only when the value
  is a status count (success/error/timeout), otherwise `--text`. Never
  turned into individual boxed "KPI cards" — that's SaaS-dashboard framing
  we're avoiding; a dense inline row is more instrument-like.
- **Status dot** — 6px filled circle, one of five states (`up`, `warn`,
  `down`, `active`, `idle`). This is the *only* status affordance — don't
  introduce a second visual language (e.g. colored pills) for the same
  concept.
- **Section / AlgoCard (study pages)** — mono uppercase accent-colored
  eyebrow above a sans H2-equivalent, hairline top border between sections
  (first section has none). Concept cards inside a section are `panel` +
  hairline border, mono name, muted sans explanation. Comparison tables use
  `panel-raised` headers, mono uppercase column labels, hairline row
  dividers — this is the pattern for any future Layer 4 vs Layer 7-style
  comparison content.
- **Buttons / controls** (simulation toggles, algorithm switches) — outline
  by default (`border`, transparent fill), accent border/text when active,
  never a filled gradient or heavy drop-shadow button. Destructive/failure
  actions (e.g. "Kill" a backend) use `status-down` red, consistent with
  §4's rule that status-down always means "this failed" or "this destroys."

When adding a new component, find the closest existing pattern in this list
and extend it rather than inventing a new visual idiom.

---

## 11. Motion

- Transitions are short and functional: `transition-colors` on hover/focus
  states, nothing longer than ~200ms for UI chrome.
- Simulation motion (a request traveling along a path, a state machine
  flipping) is the one place slower, purposeful animation belongs — it's
  explaining a real state change, so give it enough duration to be readable
  (300–600ms depending on what's being shown), with easing that reads as
  physical/systemic (ease-in-out) rather than bouncy or springy.
- No scroll-triggered reveal animations, no parallax, no auto-playing
  carousels. The reader controls pacing, not the page.

---

## 12. Accessibility

- Every status conveyed by color (dot, badge, table cell) must also be
  conveyed by text (the label next to it, or an `aria-label`) — never color
  alone.
- Focus states are the accent-colored 2px outline already defined in
  `globals.css` (`:focus-visible`). Never suppress it; never replace it with
  a subtler alternative — this is a keyboard-navigable technical tool, and
  visible focus matters more here than on a marketing site.
- Maintain AA contrast for all text/background pairs in §4; re-check when
  introducing a new muted tone or an accent-on-accent combination (e.g.
  accent text on a panel-raised background).
- Interactive simulation controls need real accessible names (not just an
  icon) — a screen-reader user should be able to tell "Kill backend 2" apart
  from "Kill backend 3."
- Respect `prefers-reduced-motion` for simulation animation: fall back to
  instant state changes rather than disabling the feature.

---

## 13. Page templates

- **Home (`/`)** — mono command-line eyebrow, sans H1 stating the site's
  actual mechanism ("System architectures, taken apart live"), one muted
  sans paragraph of explanation, then straight into the topic card grid. No
  secondary marketing sections below the fold (no testimonials, no logo
  wall, no pricing, no newsletter capture) — the card grid *is* the whole
  page.
- **Topic hub (`/topics/<slug>`)** — the simulation is the page. Controls
  and stats bar frame it; there is no separate "hero" above the simulation
  competing for attention.
- **Study (`/topics/<slug>/study`)** — pure reading surface: stacked
  `Section`s, `max-w-3xl`, mono eyebrows, sans prose, comparison tables and
  concept cards where useful. This is the one page type that's allowed to
  feel like an article rather than a dashboard, and even then it borrows the
  dashboard's mono/sans discipline rather than switching to a different
  typographic voice.

---

## 14. Adding a new topic — visual checklist

When a new topic ships, confirm it before merging:

- [ ] Uses only tokens from §4 (plus, if applicable, its own pre-approved
      topic accent — no ad hoc hex values)
- [ ] Status/health states use the five-state dot vocabulary from §10, not a
      new indicator style
- [ ] Simulation motion follows §11's timing and easing, and respects
      reduced-motion
- [ ] Card on the homepage matches the existing topic-card pattern exactly
      (no bespoke card layout for one topic)
- [ ] Study page (if present) reuses `Section`/`AlgoCard`/table patterns
      rather than introducing new prose components
- [ ] Copy passes the §9 voice check — no hype words, no fake urgency
- [ ] Nothing on the page appears in the §2 anti-pattern list
- [ ] Checked in both light and dark themes (§7) — contrast holds, no color
      relies on values tuned for only one theme, no green outside
      `status-up`
