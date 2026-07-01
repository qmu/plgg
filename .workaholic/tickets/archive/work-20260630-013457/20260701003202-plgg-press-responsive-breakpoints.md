---
created_at: 2026-07-01T00:32:02+09:00
author: a@qmu.jp
type: bugfix
layer: [UX]
effort:
commit_hash:
category: Changed
depends_on:
---

# Fix plgg-press responsive design: mid-range breakpoint, fluid hero, mobile nav reachability

## Overview

The plgg-press theme (serving the guide site at `plgg-guide.qmu.dev` → :5181) has a
threadbare responsive design: its CSS (`packages/plgg-press/src/theme/baseCss.ts`)
has **exactly one** breakpoint, `@media (max-width:768px)` (line ≈ 409). Everything
above 768px gets the full desktop layout, which produces three concrete failures
on narrow/tablet viewports. This ticket adds the missing adaptation. Independent of
the happy-dom work.

### Confirmed failures (inspected against the live :5181 render + the CSS)

1. **Tablet / small-laptop dead zone (≈ 769-1100px).** Desktop layout needs
   ≈ 1100px+ to breathe: a sticky `--vp-sidebar-w:272px` sidebar (line 42) + a
   `728px` doc column (`.vp-doc{max-width:728px}`, line ≈ 238) + `2.25rem 3.25rem`
   content padding (`.vp-content`, line ≈ 234). Between 769px and ~1100px the
   content column is crushed (e.g. ~444px usable at 820px) while still wearing
   full desktop padding — cramped and unbalanced. **No intermediate breakpoint
   narrows the sidebar or trims padding before the 768px mobile collapse.**
2. **Top-nav links unreachable on mobile.** At ≤768 the rule is
   `.vp-nav-links{display:none}` (line ≈ 428), and the hamburger
   (`.vp-menu-cb`/`.vp-menu-btn`) only toggles the **sidebar** — not the nav links.
   `navBar.ts` builds `config.nav` into `.vp-nav-links` (a separate tree from the
   sidebar), so those top-level destinations vanish on phones with no replacement.
3. **Hero doesn't scale in the gap.** `.vp-hero-title` is `3.2rem` (line ≈ 349) and
   only steps to `2.3rem` at ≤768 — an 800px laptop still renders a 3.2rem title
   that can overflow / dominate. Same for `.vp-hero-tagline`.

(What is already fine and out of scope: the features grid
`grid-template-columns:repeat(auto-fit,minmax(252px,1fr))` reflows correctly, and
the ≤768 sidebar-collapse-behind-hamburger itself works.)

## Key Files

- `packages/plgg-press/src/theme/baseCss.ts` — the single stylesheet. Add a
  **mid-range breakpoint** (≈ `@media (max-width:1024px)` / `1100px`) that narrows
  `--vp-sidebar-w` (e.g. ~220px) and reduces `.vp-content` horizontal padding before
  the existing 768px rule; make the hero scale fluidly across the gap (e.g. `clamp()`
  for `.vp-hero-title`/`.vp-hero-tagline`, or a step at the new breakpoint). Provide
  a **mobile path for the nav links** (see below). Keep the dark-mode tokens and the
  existing 768px collapse intact.
- `packages/plgg-press/src/theme/navBar.ts` — builds `.vp-nav` (brand,
  `.vp-nav-links` from `config.nav`, theme toggle, `.vp-menu-btn` ☰ label). If the
  chosen fix folds the nav links into the hamburger panel, the markup that makes
  them reachable on mobile lives here (and/or in `page.ts`, which owns the
  `#vp-menu-toggle` checkbox + `.vp-layout`).
- `packages/plgg-press/src/theme/page.ts` — owns the CSS-only menu checkbox
  (`vp-menu-cb`) and layout wrapper; relevant if the mobile nav-link reveal reuses
  the same checkbox or needs a sibling-combinator rule.
- `packages/plgg-press/src/theme/shell.ts` — `<head>` incl. the `viewport` meta
  (already present); no change expected unless a new style entry is needed.

## Implementation Steps

1. Add the mid-range `@media` breakpoint: narrow sidebar width + trim `.vp-content`
   padding so the doc column stays readable from ~769px up to the desktop width.
2. Make the hero typography fluid across the whole range (prefer `clamp()` so there
   is no jump at any single width).
3. Restore mobile reachability of the top-nav links — simplest: at ≤768 show
   `.vp-nav-links` **inside** the hamburger-revealed panel (e.g. render them into the
   sidebar/menu region, or a CSS rule that surfaces them when `vp-menu-cb` is
   checked) instead of `display:none`. Keep it CSS-only (no client JS), consistent
   with the theme's no-JS-for-layout posture.
4. Sanity-check dark mode + the existing 768px collapse still look right.
5. Verify the rendered output at representative widths (≈ 375 / 768 / 900 / 1280px).
   `scripts/test-plgg.sh` for plgg-press (golden-render specs) must stay green; if
   the theme has snapshot/golden tests, update them deliberately.

## Considerations

- **CSS-in-TS**: the stylesheet is a TS template string built by `collectCss`; keep
  edits within that structure and Prettier `printWidth: 50`. The theme deliberately
  uses class/descendant selectors + `@media` + custom properties only.
- **No client JS for layout**: the mobile menu is a CSS-only checkbox toggle
  (`vp-menu-cb`); the nav-links fix should stay CSS-only to match.
- **Golden-render parity**: plgg-press has VitePress-parity/golden tests — a CSS
  change may shift rendered output; review and update goldens intentionally, don't
  blindly accept.
- **Single source**: all responsive rules live in `baseCss.ts`; don't scatter new
  media queries across modules.
- **Don't regress** the working pieces (features grid, 768px sidebar collapse,
  dark-mode tokens).
- Verify in a browser at multiple widths (the `/run` or `/verify` flow against
  :5181) — the failures are visual and width-dependent.

## Policies

- `workaholic:design` / UX policies — readable measure across viewports; primary
  navigation must remain reachable on every device (the mobile nav-link regression
  is the sharpest UX defect here).
- `workaholic:implementation` / `policies/coding-standards.md` — no escape hatches
  in any TS touched; Prettier `printWidth: 50`.
- `workaholic:implementation` / `policies/test.md` — keep the plgg-press golden /
  render specs green; update goldens deliberately when CSS output changes.
