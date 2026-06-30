---
created_at: 2026-06-30T09:40:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash: 1237169
category: Changed
depends_on:
---

# plgg-press theme: VitePress-parity visual overhaul + fix responsive layout

## Overview

Browser review of the live guide showed the v1 theme is functional but far below the original VitePress in look-and-feel, and the responsive layout is broken: on mobile the sidebar does not collapse and the content overflows off-screen (the atomic `style_` utilities encode a fixed flex row with NO media queries). Desktop also lacks a content max-width (lines run edge to edge), code blocks have no background/padding/rounding, inline code sits on an odd baseline, the nav/sidebar are unstyled (cream bg, raw ▼/▶ markers, weak hierarchy, no active highlight), and the home features stack full-width instead of a card grid.

Fix by introducing a static, hand-authored, VitePress-like base stylesheet that OWNS layout, typography, and responsiveness (media queries the atomic utilities cannot express), injected into the shell `<style>` alongside `collectCss(body)`, and giving the theme components stable semantic class names the stylesheet targets. Keep it escape-safe (no raw `<` `>` `&` — use class + descendant selectors and `@media`, NOT `>` child combinators — so the `text()` `<style>` node survives renderToString escaping). Single light theme, zero client JS (sidebar collapses to a CSS-only disclosure on mobile).

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — the stylesheet + class changes live under packages/plgg-press/src/theme
- `workaholic:implementation` / `policies/coding-standards.md` — typed view-functions, no escape hatches, printWidth 50; CSS string stays escape-safe (no < > &)
- `workaholic:design` / `policies/emergent-design-system.md` — a coherent token-driven visual system (spacing/type/colour scale), not ad-hoc values
- `workaholic:design` / `policies/self-explanatory-ui.md` — nav + sidebar must stay navigable without JS at every viewport
- `workaholic:implementation` / `policies/accessibility-first.md` — responsive layout must keep content reachable + readable on mobile (no overflow, CSS-only collapse keyboard-accessible)

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/baseCss.ts` - NEW: the static VitePress-like stylesheet string (layout, typography, nav, sidebar, doc, code, callouts, home, responsive media queries)
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/shell.ts` - inject baseCss + collectCss(body) into the single <style>; set a root class on <body>
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/page.ts` - layout regions get semantic classes; responsive ownership moves to baseCss (drop conflicting atomic flex)
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/navBar.ts` + `sidebarTree.ts` + `homeHero.ts` + `callout.ts` - semantic classes; home features become a responsive grid; sidebar a CSS-only mobile disclosure

## Implementation Steps

1. Author packages/plgg-press/src/theme/baseCss.ts exporting a CSS string (escape-safe): a system font stack, base type scale + line-height, a brand colour, white background; a sticky top nav (border-bottom, hover/active); a fixed-width sidebar (group headings, indented links, active highlight) on desktop; a content column with max-width (~720px) centred in the remaining space; `<pre>` code blocks (subtle bg, padding, rounded, overflow-x:auto) and inline `code` (subtle bg pill, aligned baseline); callouts (tip/warning/danger left-border + tinted bg); home hero (large brand title, tagline, buttons) + a responsive features GRID; and `@media` rules so on narrow screens the sidebar collapses (CSS-only) and the content goes full-width with no overflow.
2. shell.ts: set a root class on <body> (e.g. "vp"); change the <style> to `text(baseCss + "\n" + collectCss(body))`.
3. page.ts: give the nav/sidebar/content regions semantic classes (vp-nav-wrap, vp-layout, vp-sidebar, vp-content, vp-doc); remove the atomic flex/grow that the stylesheet now owns; the mobile sidebar collapse is CSS-only.
4. navBar/sidebarTree/homeHero/callout: apply the semantic classes the stylesheet targets; home features render as a grid; sidebar active link keeps aria-current.
5. Verify VISUALLY: headless-screenshot the live guide (home, a content page, an API page) at desktop (1280) AND mobile (390) widths; iterate until it reads VitePress-like and mobile has NO overflow (sidebar collapsed, content full-width, code blocks scroll not overflow).
6. Keep zero client JS in production (no <script>); keep checkLinks + build green; re-run check-all.

## Considerations

- Escape-safety: the stylesheet ships through the `text()` `<style>` node, so it must contain no raw `<` `>` `&` — write class/descendant selectors + `@media`, never `>` child combinators or `&` nesting.
- Zero JS: the mobile sidebar collapse must be CSS-only (e.g. a `<details>`-based or checkbox-hack disclosure), since v1 ships no client runtime.
- Single light theme is acceptable for parity v1; dark mode is out of scope.
- Code blocks already carry inline-styled token spans from plgg-highlight; the stylesheet only adds the surrounding `<pre>` chrome (bg/padding/rounded/scroll), it must not override token colours.
- Verify with a real browser (headless screenshots), per the goal — do not declare parity without seeing it rendered at mobile + desktop.

## Final Report

Development completed as planned and verified in a headless browser (desktop 1280 + mobile 390) on the live guide. Added a static, escape-safe baseCss stylesheet (no < > &, no child combinators) that owns layout/typography/responsiveness, injected into the shell <style> alongside collectCss; moved the theme components to semantic classes (vp-nav/vp-sidebar/vp-layout/vp-content/vp-doc/vp-callout/vp-hero/vp-features); added a CSS-only hamburger (hidden #vp-menu-toggle checkbox + ☰ label + general-sibling reveal). Verified: tsc clean; 80 passed/0 failed; coverage 99.14/93.33/96.15/99.14; build dts; check-all.sh exit 0; zero <script> in production.

### Discovered Insights

- **Insight**: The broken responsive was caused by the theme laying out via plgg-view atomic style_ utilities, which CANNOT express @media — so a fixed flex row never collapsed and mobile content overflowed off-screen. A static stylesheet (with @media + a CSS-only checkbox-hack hamburger) is required; the atomic utilities are fine for spacing but not for responsive layout.
  **Context**: Any responsive plgg-view UI needs a static media-query stylesheet; the escape-safe subset (class/descendant selectors + @media, no > combinator, no < > &) survives the renderToString <style> text escaper, so no plgg-view change was needed.
- **Insight**: CSS specificity bug — `.vp a` (0,1,1) overrode `.vp-action-primary` (0,1,0), making the white-on-green primary button text render green-on-green (invisible). Fixed by bumping the action color rules to `.vp a.vp-action-primary` (0,2,1). A base `.vp a{color:brand}` rule will silently beat single-class color rules on links.
  **Context**: Verified the fix in-browser; the CSS-only mobile menu reveal was verified by screenshotting the page with the checkbox pre-checked (sidebar appears, zero JS).
