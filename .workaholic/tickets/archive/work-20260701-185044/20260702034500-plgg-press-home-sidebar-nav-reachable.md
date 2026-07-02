---
created_at: 2026-07-02T03:45:00+09:00
author: a@qmu.jp
type: bugfix
layer: [UX]
effort: 0.5h
commit_hash: 2d5a334
category: Changed
depends_on:
---

# Fix: the home page has no navigation — give it the sidebar so users can reach articles

## Overview

Ticket 211840 (sidebar-first layout) kept plgg-press's `layout: home` page **sidebar-less** (its old "full-width hero, no sidebar" branch, restyled). But the sidebar-first redesign removed the top nav bar — so on the home page there is now **no way to navigate to any article**: no sidebar tree, and (deliberately) no `☰` drawer button. The wordmark only links home, and the chrome rail carries just the theme toggle + GitHub. The landing page is a navigation dead-end.

**Author decision (direct):** *"we need side bar on top page."* Render the home page **with the sidebar**, matching qmu.co.jp — whose home also uses the sidebar-first shell (`DocsLayout` with `bare` content: sidebar present, only the prose wrapper dropped). The hero + feature grid render in the `<main>` column beside the sidebar.

## Key Files

- `packages/plgg-press/src/theme/page.ts` — the home branch currently emits `[chromeRail, contentColumn]` (no `sidebarColumn`) and calls `mobileBar(..., showMenu=!home)` so the drawer button is hidden on home. Change: home renders the SAME shell as content pages — `[chromeRail, sidebarColumn, contentColumn]` — with `.vp-home` (hero) as the main's inner wrapper instead of `.vp-doc`; and `mobileBar` gets `showMenu: true` on home so the mobile drawer works.
- `packages/plgg-press/src/theme/page.spec.ts` — the "home page renders the hero content with NO sidebar" test asserts the sidebar is absent; flip it to assert the sidebar IS present on home (wordmark + `aria-label="Sidebar navigation"`) alongside the hero (`.vp-home`).
- `packages/plgg-press/src/theme/baseCss.ts` — only if the hero needs width/spacing tweaks now that it shares the row with the `w-64` sidebar (`.vp-home` max-width). Keep escape-safe.

## Implementation Steps

1. In `page.ts`, make the `layout: home` branch include `sidebarColumn(config, activePath, base)` (same as content pages); keep `.vp-home` as the main wrapper.
2. Pass `showMenu: true` to `mobileBar` on home (both branches now have a drawer), so below-lg users reach the nav too.
3. Update `page.spec.ts`: the home page now HAS the sidebar — assert `aria-label="Sidebar navigation"` present and the hero (`.vp-home`) rendered.
4. `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh` green ≥90%.
5. Rebuild the guide; confirm the top page shows the sidebar and every article is reachable from it (light + dark, lg + mobile drawer).

## Quality Gate

- The home page renders the sidebar tree (every article reachable from `/`) on lg+, and the mobile `☰` drawer on small screens.
- Hero + feature grid still render left-aligned in the content column (no CTA, flat cards — unchanged).
- tsc + tests green ≥90%; `baseCss` escape-safe; no `as`/`any`/`ts-ignore`.
- Guide top page navigates to articles (visual confirm, light/dark, lg/mobile).

## Considerations

- This reverses 211840's explicit "home = no sidebar" choice under a **later, direct author correction** — the sidebar-first shell made the old top-nav-less home unnavigable, which 211840 did not account for. qmu.co.jp's home carries the sidebar, so this also tightens the match.
- The hero shares the row with the `w-64` sidebar now, so it is narrower than the old full-width variant; that is the intended qmu behavior. Adjust `.vp-home` padding/max-width only if it reads cramped.

## Final Report (home page now carries the sidebar — articles reachable from /)

`page.ts`: the `layout: home` branch now renders the SAME app shell as content pages — `[chromeRail, sidebarColumn, contentColumn]` — instead of `[chromeRail, contentColumn]`; the main column still wraps the hero in `.vp-home` (not `.vp-doc`). `mobileBar` is now called with `showMenu: true` on every page, so the below-lg `☰` drawer works on home too. This reverses 211840's "home = no sidebar" choice under the author's direct correction: with the top nav gone, a sidebar-less home was a navigation dead-end.

`page.spec.ts`: the home test now asserts the sidebar IS present on home (`aria-label="Sidebar navigation"`) alongside the hero (`class="vp-home"`), still with no `<details>` (always-expanded tree).

**Verify:** `packages/plgg-press` tsc clean, **84 passed**, coverage ≥90% (unchanged); `baseCss` untouched (the hero renders in the content column beside the `w-64` sidebar — the qmu behavior); no escape hatch. Guide rebuilt — the top page now shows the sidebar with every article reachable. Visual confirm (light/dark, lg/mobile drawer) is the human sign-off carried from 211839/211840.
