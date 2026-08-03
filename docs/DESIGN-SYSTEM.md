# ulearn — Design System

This document is the design contract for ulearn. It exists so that every
screen, component and line of copy we add reads like it came from the same
hand — and so that hand looks like it belongs to someone who genuinely wants
you to understand a hard topic, not someone showing off how technical they
can look.

Read this before styling anything. If a change isn't traceable back to a
principle here, it's a signal the system needs updating — not an excuse to
freelance.

---

## 1. Who this is for, and why that dictates the design

ulearn teaches systems-design topics — load balancing, circuit breakers,
consistent hashing, message queues — to people who want to actually
understand how the systems they use every day work. Some are students,
some are engineers prepping for an interview, some are just curious. They
don't all live in a terminal, and they shouldn't have to feel like they do
to use this site.

That audience and that content type is the entire design brief:

- **This is a friendly, approachable learning product, built on real
  running simulations.** Every page's job is to make a system's behavior
  easy to see and easy to play with — traffic flowing, backends failing, a
  hash ring rebalancing — presented in a way that invites you in rather
  than gatekeeping.
- **Credibility comes from clarity, not jargon.** A reader trusts a page
  that explains things simply and lets them experiment more than one that
  performs technical severity at them.
- **The reader is here to build a correct mental model, comfortably.**
  Typography and layout should support close reading and comparison
  (cards, side-by-side states, before/after), with enough warmth and
  breathing room that it doesn't feel like homework.

If a proposed change would look at home only in a Kubernetes dashboard or a
terminal emulator and nowhere else, it's probably too austere for this
product — we want the polish and warmth of a well-made modern app, applied
to genuinely technical content.

---

## 2. What we are explicitly not building

Name the anti-pattern so it's easy to catch in review. **None of the
following belong in ulearn:**

- Fake, decorative terminal sessions as the primary interface metaphor —
  command-line flourishes are fine as a rare accent (see §9), never the
  whole page's framing.
- Monospace type used everywhere by default. Monospace is for actual code,
  data values and log lines only (see §5) — headings, nav, labels and body
  copy are sans.
- Content-free decoration: floating blobs, mesh gradients, or abstract 3D
  illustrated shapes used as hero-section filler with nothing behind them.
- Generic stock "diverse people looking at laptops" photography, or
  AI-image illustrations of robots/brains/lightbulbs standing in for real
  product content.
- Centered, oversized "Welcome to the Future of Learning™" hero copy with a
  single vague CTA button and nothing to back it up.
- Skeuomorphic drop shadows, glossy buttons, or gradients as decoration
  divorced from any real UI state (this is different from the intentional
  brand-mark gradient in §8, which is a fixed, deliberate identity element,
  not a decorative treatment applied ad hoc elsewhere).
- Hype copy: "unlock," "supercharge," "revolutionize," "game-changing," "in
  just minutes" (see §9's voice rules — friendly is not the same as
  hypey).

If you catch yourself reaching for terminal cosplay because "that's what a
serious dev tool looks like," stop — the content is technical enough to
carry itself; the chrome around it gets to be warm and easy to use.

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
   image standing in for the product. This is the one thing we keep,
   unchanged, from a more austere earlier version of this system: the
   friendliness is in the chrome around the simulation, not a reason to
   fake the simulation itself.
3. **Sans is the voice, monospace is a citation.** Use the sans body font
   for everything that is prose, UI labels, headings and navigation. Use
   monospace *only* for things that are literally data or code: numbers,
   log lines, identifiers, inline commands. Mixing them the other way
   round — mono headings, mono nav — is what makes a page read as
   unapproachable; don't do it.
4. **One accent color, used generously but not everywhere.** A blue
   (`--accent`) marks interactivity, primary actions and the single most
   important number on a screen. Primary actions get a filled accent
   button; everything else stays outlined or plain so the accent still
   reads as "the important thing," not wallpaper.
5. **Status color means one thing, everywhere — and `--accent` is not a
   status color.** Green/amber/red/blue map to healthy/warning/down/in-flight
   in every simulation, every table, every badge, with no exceptions and no
   reuse for unrelated meanings. `status-up` stays green — "healthy =
   green" is a convention people read faster than a legend. `--accent`
   (brand blue) and `status-active` (in-flight blue) are deliberately
   *different* blues (see §4) so "click this" and "this is currently
   processing" never look like the same signal.
6. **Comfortable density.** Give content room to breathe — generous
   padding on cards, clear spacing between sections — while simulations and
   control panels are still allowed to be a little denser where the
   information genuinely benefits (see §10). Default to more whitespace,
   not less; density is the exception, not the rule.
7. **Motion explains state changes and adds a little life.** Animation
   exists to show a request moving from client to backend, a circuit
   breaker flipping state, a ring rebalancing — and small, tasteful hover
   and transition polish on buttons/cards is welcome too, as long as it
   stays quick and purposeful rather than showy.

---

## 4. Color

The palette is a near-neutral warm canvas, two panel elevations, one brand
accent (blue), and four status colors reused everywhere. Both themes share
the same *structure* — the same token names, the same relationships between
them — and differ only in value. Implement both sets as CSS custom
properties in `app/globals.css`, switched by a `data-theme` attribute on
`<html>` (see §7); treat the tables below as their spec.

The neutrals in both themes carry a cool, faint blue cast — the same family
as `--accent` and the brand mark's gradient (§8) — rather than a clinical
pure gray or a warm/brown tint. This is deliberate: mark, accent and canvas
all read as one blue-leaning palette instead of competing hues. Keep the
tint subtle enough that `--bg` and `--panel` still read as "near-black" /
"near-white" at a glance, not literally navy or baby blue.

### Dark theme (default when the OS prefers dark)

| Token             | Value     | Use                                                             |
| ------------------ | --------- | ---------------------------------------------------------------- |
| `--bg`             | `#0b0f17` | Page canvas — cool near-black, blue-leaning                      |
| `--panel`          | `#131a26` | Cards, nav bar, default raised surface                          |
| `--panel-raised`   | `#1b2433` | A surface raised *above* a panel (table headers, active tab)     |
| `--border`         | `#26303f` | Default hairline border                                          |
| `--border-strong`  | `#37455a` | Hover / focus-adjacent border, emphasis dividers                 |
| `--text`           | `#eef2f8` | Primary text                                                     |
| `--text-muted`     | `#94a3b8` | Secondary text, descriptions, body copy inside cards              |
| `--text-faint`     | `#7d8ca6` | Tertiary — labels, timestamps, disabled state                    |
| `--accent`         | `#4c8dfb` | Interactive elements, the one number that matters, active state  |
| `--accent-dim`     | `#1d3a66` | Accent at rest / secondary accent use                            |
| `--accent-foreground` | `#0b0f17` | Text/icon color *on top of* a filled `--accent` surface (a filled pill/button) — dark theme's accent is light enough that white text fails AA, so this matches `--bg` instead |
| `--status-up`      | `#34d399` | Healthy, success, passing (the one sanctioned green — see §3.5)  |
| `--status-warn`    | `#fbbf24` | Degraded, slow, retrying                                         |
| `--status-down`    | `#e0342a` | Failed, rejected, dead                                           |
| `--status-active`  | `#22d3ee` | In-flight / currently processing — a *different* blue from `--accent` |

### Light theme (default when the OS prefers light)

| Token             | Value     | Use                                                             |
| ------------------ | --------- | ---------------------------------------------------------------- |
| `--bg`             | `#f4f7fb` | Page canvas — cool pale blue-white, not stark white               |
| `--panel`          | `#ffffff` | Cards, nav bar, default raised surface                          |
| `--panel-raised`   | `#e7edf6` | A surface raised *above* a panel (table headers, active tab)     |
| `--border`         | `#d8e0ec` | Default hairline border                                          |
| `--border-strong`  | `#b7c3d6` | Hover / focus-adjacent border, emphasis dividers                 |
| `--text`           | `#10151f` | Primary text                                                     |
| `--text-muted`     | `#52607a` | Secondary text, descriptions, body copy inside cards              |
| `--text-faint`     | `#63728c` | Tertiary — labels, timestamps, disabled state                    |
| `--accent`         | `#1d4ed8` | Interactive elements, the one number that matters, active state  |
| `--accent-dim`     | `#dbe6fb` | Accent at rest / secondary accent use (soft blue-tint chip fill) |
| `--accent-foreground` | `#ffffff` | Text/icon color *on top of* a filled `--accent` surface — light theme's accent is dark enough that near-white text passes AA here |
| `--status-up`      | `#0a8f5b` | Healthy, success, passing (darkened for AA on a light canvas)    |
| `--status-warn`    | `#a15c07` | Degraded, slow, retrying                                         |
| `--status-down`    | `#b31c12` | Failed, rejected, dead                                           |
| `--status-active`  | `#0e7490` | In-flight / currently processing — a *different* blue from `--accent` |

**Rules:**

- Never introduce a new hue outside these tables without a documented
  reason. Per-topic "accent" values (see §8) and the brand mark's fixed
  indigo/purple gradient (see §8) are the sanctioned exceptions.
- No green outside `--status-up`. Not in a button, not in a link, not in a
  hover state, not in a decorative highlight. If a design calls for a
  second positive-feeling color, reach for the accent blue or a neutral,
  not green.
- `--accent` and `--status-active` are both blues and must stay visibly
  different blues (compare the hex pairs above — accent leans more
  indigo/azure, status-active leans more cyan/teal) so "this is clickable"
  and "this is currently processing" are never the same signal. Never
  substitute one for the other even though they're in the same family.
- Status colors are semantic, not decorative. `status-down` must always mean
  "this thing failed," never reused as a generic "important" or
  "destructive-button" red distinct from that meaning — a destructive
  action (e.g. "Kill" a backend) *is* a failure-adjacent action, so reusing
  `status-down` there is correct, not a second meaning.
- Contrast floor: body text on `--panel` must clear WCAG AA (4.5:1) **in
  both themes independently** — don't assume a pair that passes in dark
  mode passes in light mode with inverted lightness; verify each. This
  includes `--text-faint`: timestamps and labels are lower-emphasis than
  `--text-muted`, not illegible — they still need to clear 4.5:1 against
  `--panel`/`--bg`, just with less headroom than `--text-muted`.
- Gradients are allowed only as the fixed brand-mark treatment (§8) or as a
  *data* encoding (e.g. a heat gradient on a load graph) — never as
  arbitrary hero/card/button decoration elsewhere.
- Set `color-scheme: dark` / `color-scheme: light` alongside the theme
  attribute so native form controls, scrollbars, etc. match automatically.

---

## 5. Typography

Two typefaces, both from the Geist family already wired up via
`next/font`: **Geist Sans** for everything except data, **Geist Mono** for
numbers, code, identifiers and log/terminal-flavored copy only.

| Role                          | Font        | Size / weight                          |
| ------------------------------ | ----------- | ---------------------------------------- |
| Page title (H1)                | Sans        | `text-2xl sm:text-3xl`, `font-semibold`, tight tracking |
| Section heading (H2)           | Sans        | `text-xs`–`text-sm`, uppercase or `font-semibold`, `--accent` |
| Card title                     | Sans        | `text-base`, `font-medium`               |
| Body / lesson prose            | Sans        | `text-sm`, `leading-relaxed`, `--text-muted` |
| Nav links, tabs, button labels | Sans        | `text-sm`, medium weight                 |
| Data label (stat name, badge)  | Sans        | `text-[11px]`, uppercase, `--text-faint` |
| Data value (stat number)       | Mono        | `text-sm`–`text-lg`, `font-semibold`     |
| Log lines, timestamps, IDs     | Mono        | `text-xs`, `--text-muted`/`--text-faint` |
| Inline code / commands         | Mono        | `text-sm`, `--text` on `--panel-raised`  |

**Rules:**

- A page's H1 is always sans. Nav links, tabs and button labels are always
  sans — monospace nav is the single most common way this system used to
  read as "unfriendly," so don't bring it back piecemeal.
- Never center large blocks of body prose. Left-align, `max-w-3xl` or
  tighter for reading columns — this is still a technical reading
  experience, just a comfortable one.
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
- **Radius:** `rounded-lg` (8px) for small chips/inline controls,
  `rounded-xl` (12px) for buttons and small cards, `rounded-2xl` (16px) for
  larger panels and hero-adjacent surfaces. Corners should read as soft and
  modern, not sharp/instrument-like and not pill-shaped everywhere — reserve
  fully-rounded (`rounded-full`) for pill buttons/tabs and status chips.
- **Elevation:** a hairline `--border` plus a soft, subtle shadow on cards
  and the sticky top nav is welcome now (`shadow-sm`-scale, never a heavy
  drop shadow) — surfaces can read as gently raised, not perfectly flat.
- **Density:** default card padding `p-5`–`p-6`. Control/simulation
  surfaces can drop to `p-4` where information density genuinely benefits
  (see §10), but that's the exception, not the house default.

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
  under `[data-theme="dark"]` / `[data-theme="light"]` selectors and
  nothing else needs to change per-theme, because every component is
  already built on the custom-property tokens rather than hard-coded
  colors.
- **The toggle itself is a small, friendly icon control** — a sun/moon
  glyph switch next to the nav links in `TopNav`, with a quick
  `transition-colors`/`transition-transform` on flip. This is a deliberate
  reversal of an earlier, more austere version of this system that banned
  the sun/moon pattern as "too SaaS" — for this friendlier direction, the
  familiar icon is the right amount of polish, not a red flag.
- **No theme-crossfade choreography.** Switching themes swaps token values;
  a brief `transition-colors` (see §11) on background/border/text is enough.
  Don't build a special animated transition just for the toggle moment.
- **Both themes ship simulation-ready.** Status dots, event-log severity
  colors, and any simulation-specific styling must be re-checked against
  the light table in §4, not just eyeballed — a status color tuned for
  contrast on `#0e0b0a` will not automatically read correctly on `#faf3f0`.

---

## 8. The background canvas, the brand mark, and per-topic accent

Keep the page background simple — a plain `--bg` canvas, no ambient
texture. (An earlier version of this system used a faint dot-grid
"blueprint" texture to signal "engineering tool"; that's dropped along with
the rest of the instrument-panel framing — it's one more thing that read as
cold rather than inviting.)

The brand mark (`components/brand/logo.tsx`) is the one place a gradient is
permanently sanctioned: a lowercase "u" — for Uttam, and for "you" — with a
rising spark above its open stem, on a fixed blue gradient tile (`#60a5fa`
→ `#3b82f6` → `#1d4ed8`, the same blue family as `--accent` so the mark and
the UI read as one palette rather than clashing hues). This is a fixed
identity asset, not a decorative pattern to reuse elsewhere — don't pull
that gradient into buttons, cards or backgrounds; it belongs to the mark
alone.

Each topic may carry a small identity: an accent hue for its own pages and
a single emoji used only in the topic's own card/nav context (never inline
in prose). A topic accent shifts a border or a small set of interactive
elements on *its own* pages; it never overrides the global `--accent` blue
used for site-wide interactive chrome (nav, primary links). Per-topic
accents still may not use green (§3.5).

---

## 9. Voice and content style

Copy is part of the design system — a page that looks friendly but reads
like a man page breaks the illusion immediately, and one that reads like ad
copy breaks it the other way.

- **Direct and warm, second person where it helps ("watch what actually
  happens"), never hype-driven.** No "unlock," "supercharge," "revolutionize,"
  "game-changing," "in just minutes" — friendly is not the same as hypey.
- **Show, don't sell.** "Every topic below is a running simulation, not a
  page of prose" is the house voice: a factual claim the reader can verify
  immediately, not an adjective-stacked pitch.
- **Terminal flourishes, if used at all, are single-use and optional** —
  fine as a rare accent at an entry point, never the framing device for a
  whole page and never required just to feel "technical enough."
- **Precision over enthusiasm in labels.** "available" / "planned," not
  "Coming Soon! 🎉". Status language matches the status-dot system in §4.
- **Explanations earn their length.** Systems-design nuance (e.g. why IP
  hash reshuffles on failure) needs real paragraphs — don't compress
  correctness into a marketing-style bullet fragment. Density in prose is
  fine; vagueness is not.

---

## 10. Core components (patterns already in use — keep extensions consistent with these)

These are shared, topic-agnostic components under `components/` — a new
topic should import and configure them, not re-implement its own version.
Only the business logic wiring them up (what the buttons *do*, what the
stats *are*) is topic-specific and belongs under `app/topics/<slug>/`.

- **Top nav** (`components/layout/top-nav.tsx`) — sticky, `h-14`,
  `--panel`/`bg-bg/90` + blur, hairline bottom border, brand mark (§8) plus
  sans wordmark. Nav links are sans, medium weight, muted, brighten on
  hover. Keep navigation minimal — this is not a site with a mega-menu.
- **Topic card** (inline on the home page — no dedicated component yet) —
  `panel` surface, `rounded-2xl`, hairline border that brightens on hover
  (`border-strong`) plus a soft shadow lift, a sans uppercase category
  eyebrow + status dot up top, sans title, muted sans tagline, sans "open
  simulation →" affordance that appears on hover/focus. Unavailable topics
  are the same shape at `opacity-60` with an "idle" dot and no link — never
  hide planned content, show it as inert.
- **Topic tabs** (`components/topic/topic-tabs.tsx`) — the Simulate/Study
  pill nav at the top of a topic page. Takes a `tabs: {href, label}[]` prop
  — a new topic passes its own paths, it doesn't fork the component.
- **Stat bar** (`components/simulation/stats-bar.tsx`) — takes an
  `items: StatItem[]` prop (`{label, value, color?}`). Inline label/value
  pairs (sans label, mono value), colored only when the value is a status
  count (success/error/timeout), otherwise `--text`. A dense inline row is
  fine here since it's read at a glance while a simulation runs — this is
  the one place §3.6's density exception applies most directly.
- **Event log** (`components/simulation/event-log.tsx`) — takes an
  `entries: LogEntry[]` prop (`{id, time, level, message}`). Scrolling,
  monospace (it's genuinely log data), severity-colored by `level`.
- **Buttons / controls** (`components/simulation/button.tsx`) —
  `rounded-full`, outlined by default. `active` fills it with a translucent
  accent/status-down tint; `primary` is a fully filled accent button for
  the one primary action on a panel (e.g. "Send one request"); `danger`
  swaps the accent tint for `status-down`, consistent with §4's rule that
  status-down always means "this failed" or "this destroys." A topic's
  `AlgorithmSwitch`/`TrafficControls`-equivalent components (its own
  business logic) should compose this `Button`, not redefine it.
- **Status dot** (`components/ui/status-dot.tsx`) — 6px filled circle, one
  of five states (`up`, `warn`, `down`, `active`, `idle`). This is the
  *only* status affordance — don't introduce a second visual language (e.g.
  colored pills) for the same concept.
- **Study page components** (`components/study/`) — `Section` (sans
  uppercase accent-colored eyebrow above a sans H2-equivalent, hairline top
  border between sections, auto-derives its anchor id from the title via
  `slugify`), `ConceptCard` (`panel` + hairline border + `rounded-xl`, sans
  name, muted sans explanation), `ComparisonTable` (`panel-raised` headers,
  sans uppercase column labels, hairline row dividers, generic
  `columns`/`rows` props), and `TableOfContents` (sticky "on this page" nav,
  takes the same `sections: string[]` title list passed to each `Section` so
  the anchors always match). This is the full pattern for any future study
  page — reuse all four rather than hand-rolling prose components again.

When adding a new component, find the closest existing pattern in this list
and extend it rather than inventing a new visual idiom.

---

## 11. Motion

- Transitions are short and functional: `transition-colors`/`transition-transform`
  on hover/focus states, generally under ~200ms for UI chrome — a little
  scale or lift on button/card hover is welcome for warmth, kept subtle.
- Simulation motion (a request traveling along a path, a state machine
  flipping) is the one place slower, purposeful animation belongs — it's
  explaining a real state change, so give it enough duration to be readable
  (300–600ms depending on what's being shown), with easing that reads as
  physical (ease-in-out) rather than bouncy or springy.
- No scroll-triggered reveal animations, no parallax, no auto-playing
  carousels. The reader controls pacing, not the page.

---

## 12. Accessibility

- Every status conveyed by color (dot, badge, table cell) must also be
  conveyed by text (the label next to it, or an `aria-label`) — never color
  alone.
- Focus states are the accent-colored 2px outline already defined in
  `globals.css` (`:focus-visible`). Never suppress it; never replace it with
  a subtler alternative — this is still a keyboard-navigable tool, and
  visible focus matters regardless of how friendly the chrome looks.
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

- **Home (`/`)** — sans H1 stating the site's actual mechanism ("System
  architectures, taken apart live"), one muted sans paragraph of
  explanation, then straight into the topic card grid. No secondary
  marketing sections below the fold (no testimonials, no logo wall, no
  pricing, no newsletter capture) — the card grid *is* the whole page, just
  presented with more warmth and room than a bare dashboard would give it.
- **Topic hub (`/topics/<slug>`)** — the simulation is the page. Controls
  and stats bar frame it; there is no separate "hero" above the simulation
  competing for attention.
- **Study (`/topics/<slug>/study`)** — pure reading surface: stacked
  `Section`s, `max-w-3xl`, sans eyebrows, sans prose, comparison tables and
  concept cards where useful. This is the one page type that's allowed to
  feel like a well-designed article rather than a dashboard.

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
