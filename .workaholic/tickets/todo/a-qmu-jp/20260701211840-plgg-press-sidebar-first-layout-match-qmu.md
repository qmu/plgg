---
created_at: 2026-07-01T21:18:40+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash:
category:
depends_on: [20260701211839-plgg-press-tokens-typography-match-qmu.md]
---

# Match plgg-press default appearance to qmu.co.jp — part 2: sidebar-first layout & shell

## Overview

Restructure plgg-press's default **layout** to qmu.co.jp's sidebar-first app-shell — the structural half of the redesign, depending on the tokens/typography delivered in part 1 ([20260701211839-plgg-press-tokens-typography-match-qmu.md](.workaholic/tickets/todo/a-qmu-jp/20260701211839-plgg-press-tokens-typography-match-qmu.md)).

plgg-press today is a **top-header** layout (sticky `navBar` with brand + right-aligned links + toggle + hamburger; centered `.vp-doc` 728px content; page scroll; no footer). qmu.co.jp is **sidebar-first** with no top header:

- A **48px far-left chrome rail** holding the theme toggle + GitHub icon pinned to the bottom (lg+).
- A **`w-64` sidebar**: the wordmark (株式会社くむ / the site title) at top as the home link (rendered as the inverted active block), then an **always-expanded** nav tree (no collapse carets), active/hover = inverted near-black pill.
- A **`<main>`** with `<article class="prose max-w-3xl">` — **left-aligned**, not centered — plus a **centered muted footer** on every page.
- **App-shell scroll** on lg+: `max-w-[1440px]`, `h-screen overflow-hidden`, each column scrolls independently. Below lg: chrome rail hidden, mobile bar + drawer, normal page scroll.
- Home/hero: **left-aligned**, small semibold eyebrow + big **weight-400** name, muted tagline, **no CTA buttons**; feature cards `bg-bg-soft` rounded, flat (no border, no hover lift).

**Fidelity (author-confirmed):** tokens + **layout** match — reproduce this structure and its responsive behavior; visually close, not pixel-perfect.

**Scope boundary — TOC deferred.** qmu.co.jp has a right-rail + mobile table-of-contents (`Toc.tsx`); plgg-press has none. A TOC is a net-new component beyond "layout match" and is **out of scope here** — noted as a possible follow-up ticket, not built.

**Trip Origin:** none — direct request ("make plgg-press default appearance same as qmu.co.jp"); split from part 1 during ticket creation.

## Policies

- `workaholic:design` / `policies/modeless-design.md` — the app-shell must stay modeless and responsive: independent-scroll columns on lg+, drawer/mobile-bar below lg, dark/light preserved; no state trapping the reader.
- `workaholic:design` / WCAG conformance & reach — the always-expanded nav, chrome-rail controls, and drawer must be keyboard-reachable and screen-reader-labelled (`aria-current` on the active leaf, labelled toggle/GitHub/hamburger); the mobile drawer must be operable without a pointer.
- `workaholic:design` / `policies/emergent-design-system.md` — reuse the part-1 tokens for the inverted-pill active state, chrome rail, footer; no new ad-hoc colors.
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`@ts-ignore`; the layout builders stay pure/data-last plgg-view; `baseCss` layout rules stay escape-safe.
- `workaholic:implementation` / `policies/directory-structure.md` — changes stay in `packages/plgg-press/src/theme/`; colocated `*.spec.ts` updated.
- `plgg-coding-style` (skill) — data-last plgg-view builders, Prettier printWidth 50, specs green.

## Key Files

plgg-press (to change):

- `packages/plgg-press/src/theme/page.ts` — the layout composition. Rework: drop the top `navBar`; emit `chrome rail + sidebar (wordmark + tree) + <main>(<article> + footer)`; keep the `.vp-home` (hero, no sidebar) branch but restyle. Add the app-shell wrapper.
- `packages/plgg-press/src/theme/navBar.ts` — repurpose into the far-left **chrome rail** (toggle + GitHub at bottom) or remove and fold its controls elsewhere; the top bar goes away on lg+.
- `packages/plgg-press/src/theme/sidebarTree.ts` — remove the `<details>`/`<summary>` collapse tree → **always-expanded** groups; add the wordmark/home link at the top; active/hover leaf = inverted pill (`--color-hover`/`--color-hover-ink`), `aria-current` preserved.
- `packages/plgg-press/src/theme/homeHero.ts` — hero **left-aligned**: eyebrow + weight-400 name + muted tagline, **drop the CTA buttons**; feature cards `bg-bg-soft` rounded + flat (no border/hover-lift).
- `packages/plgg-press/src/theme/baseCss.ts` — the layout CSS: replace `.vp-nav` (sticky top) / `.vp-layout` / `.vp-sidebar` (272px sticky) / `.vp-doc` (centered 728px) with the chrome-rail + `w-64` sidebar + `prose max-w-3xl` left-aligned + `h-screen` independent-scroll app-shell + footer + responsive (below-lg drawer) rules.
- `packages/plgg-press/src/theme/themeScript.ts` — ensure the toggle still drives dark/light from the chrome-rail control (and any mobile drawer), consistent with part 1's storage key.
- Colocated specs: `page.spec.ts`, `navBar.spec.ts`, `sidebarTree.spec.ts`, `homeHero.spec.ts`, `shell.spec.ts` — all assert on class names/structure and must be updated to the new markup.

qmu.co.jp (reference, read-only):

- `packages/astro/src/layouts/DocsLayout.astro` — the sidebar-first app-shell + 48px chrome rail structure to mirror (columns, independent scroll, mobile behavior).
- `packages/astro/src/components/react/SidebarTree.tsx` — always-expanded groups + inverted-pill active/hover markup.
- `packages/astro/src/components/react/ThemeToggle.tsx` — SVG sun/moon toggle behavior/markup (replaces plgg-press's CSS-drawn circle).
- `packages/astro/src/components/SiteFooter.astro` — the centered muted copyright footer.
- `packages/astro/src/pages/index.astro` — hero (left-aligned, eyebrow, weight-400 name, no CTA) + flat feature cards.
- `packages/astro/src/components/react/MobileBar.tsx` — mobile bar + drawer behavior for below-lg.

## Related History

- Depends on part 1 (`20260701211839-…`, the tokens the inverted-pill/chrome-rail/footer reuse).
- plgg-press SSG origin ([20260617001953-ssg-static-site-generation.md](.workaholic/tickets/archive/work-20260617-002003/20260617001953-ssg-static-site-generation.md)).

## Implementation Steps

1. **App-shell scaffold.** In `page.ts` + `baseCss.ts`, build the lg+ shell: `max-w-[1440px]`, `h-screen overflow-hidden`, three independently-scrolling columns (chrome rail 48px / sidebar `w-64` / `<main>`). Remove the sticky top-header layout.
2. **Chrome rail.** From `navBar.ts`: a far-left 48px rail with the SVG theme toggle + GitHub icon pinned to the bottom (lg+). Hidden below lg.
3. **Sidebar.** In `sidebarTree.ts`: wordmark/home link at top (rendered inverted when active), then always-expanded groups (drop `<details>` logic), inverted-pill active/hover leaves, `aria-current` retained. Uniform spacing.
4. **Content + footer.** `<main>` → `<article class="prose max-w-3xl">` left-aligned; add the centered muted footer on every page (new markup in `page.ts` + CSS).
5. **Hero.** `homeHero.ts` left-aligned eyebrow + weight-400 name + tagline, no CTA; flat `bg-bg-soft` feature cards.
6. **Responsive.** Below lg: hide chrome rail, show mobile bar + drawer (mirror `MobileBar.tsx`), normal page scroll; ensure keyboard + screen-reader operability.
7. Update all affected `*.spec.ts` to the new structure; `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh`.
8. **Verify visually** (Quality Gate): screenshot-compare the doc page (lg + mobile), home/hero, and dark/light against qmu.co.jp.

## Quality Gate

**Acceptance criteria:**
- Default layout is sidebar-first with **no top header** on lg+: a 48px chrome rail (toggle + GitHub bottom), a `w-64` sidebar (wordmark + always-expanded tree, inverted-pill active), and a left-aligned `prose max-w-3xl` `<main>` with a centered muted footer.
- App-shell scrolls each column independently on lg+ (`h-screen`); below lg the chrome rail is hidden and a mobile bar + drawer provide nav, with normal page scroll.
- Home/hero is left-aligned (eyebrow + weight-400 name + tagline, no CTA); feature cards are flat `bg-bg-soft` rounded (no border/hover-lift).
- Nav/toggle/GitHub/drawer are keyboard-reachable and labelled; `aria-current` marks the active leaf.
- No `as`/`any`/`@ts-ignore`; `baseCss` layout rules stay escape-safe (no raw `<`/`>`/`&`).

**Verification method:**
- `scripts/tsc-plgg.sh` exits 0; `scripts/test-plgg.sh` green, coverage ≥90%; updated `page`/`navBar`/`sidebarTree`/`homeHero`/`shell` specs assert the new structure.
- **Playwright screenshots**: doc page at lg and at mobile width, home/hero, each in light and dark, placed side-by-side with qmu.co.jp — layout, chrome rail, sidebar, footer, and hero read as the same design; drawer opens/closes and toggle works in-session.
- Keyboard walkthrough (tab order reaches nav, toggle, GitHub, drawer) confirmed.

**Gate:** tsc + test green, ≥90% coverage, no escape hatch, escape-safe `baseCss`, and the side-by-side screenshots (lg + mobile, light + dark) plus the keyboard walkthrough confirm layout parity before approval.

## Considerations

- **Biggest structural risk.** Moving from top-header to sidebar-first reshapes `page.ts`, `navBar.ts`, `sidebarTree.ts` and the `.vp-nav`/`.vp-layout`/`.vp-sidebar` CSS at once; land the lg+ shell first and get it green before the responsive/drawer path to keep the diff reviewable (`packages/plgg-press/src/theme/page.ts`).
- **Chrome rail vs. mobile.** The rail is lg+-only; ensure the toggle + GitHub controls remain reachable below lg (in the mobile bar/drawer) so functionality isn't lost when the rail hides (`packages/plgg-press/src/theme/navBar.ts`).
- **Always-expanded nav removes logic.** Dropping `<details>` simplifies `sidebarTree.ts` but changes its spec; ensure deep trees stay usable without collapse (scroll, not fold) (`packages/plgg-press/src/theme/sidebarTree.ts`).
- **`baseCss` escape-safety** still applies to all new layout selectors — no `>` child combinators (`packages/plgg-press/src/theme/baseCss.ts`).
- **TOC deferred.** qmu's right-rail/mobile TOC is out of scope; if wanted, a follow-up ticket adds a `toc` builder + `page.ts` slot (reference `packages/astro/src/components/react/Toc.tsx`).
