---
created_at: 2026-07-03T05:27:17+09:00
author: a@qmu.jp
type: refactoring
layer: [UX]
effort: 1h
commit_hash: a4e2c57
category: Changed
depends_on:
---

# Reconcile plggpress tokens, typography and accessibility against the current qmu.co.jp oracle

## Overview

Re-diff `packages/plggpress/src/theme/baseCss.ts` against the CURRENT authoritative style source — `/home/ec2-user/projects/qmu-co-jp/packages/astro/src/styles/global.css` (executable truth) plus `docs/design/*.md` (prose guideline) — and drive every mismatch to qmu's exact value or a recorded exception. The original match (tickets 211839/211840) was validated only by unit specs and a from-source build; the oracle has since drifted, and the diff below shows the residual gaps concentrate in dark-mode values, link/code treatments, heading rhythm, and — most importantly — accessibility rules qmu carries that plggpress dropped. The emergent-design-system policy frames this precisely: each qmu CSS rule is an already-made decision; plggpress adopts it, and any divergence is explicit, never silent.

Scope decisions (recommended defaults recorded while the developer was away — confirm at the `/drive` gate): callouts adopt qmu's **tinted surfaces**; the landing-page and TOC halves are the dependent tickets `…052718` and `…052719`.

## The diff to burn down (from discovery, 2026-07-03)

Light palette, sidebar 256px / rail 48px / shell 1440px / content 48rem: already MATCH. Fix list:

| Dimension | qmu (target) | plggpress (current) |
|---|---|---|
| Dark body ink | `rgba(240,240,245,0.92)` | `#e6e6e9` opaque |
| Dark muted | `rgba(235,235,245,0.55)` | `#a0a0a8` |
| Dark heading/brand | `rgba(255,255,255,0.95)` | `#f5f5f7` / `#ffffff` |
| Dark divider | single `#262629` | border `#2e2e34` + divider `#2a2a30` |
| Dark toggle knob | `--knob #e4e4e7` (WCAG 1.4.11-tuned) | no token |
| Sans stack | `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` + emoji | classic system stack |
| Body leading | ~1.75 (typography default) | 1.65 |
| h4 | 1.0625rem | 1.03rem |
| h1/h2 letter-spacing | none | -0.011em / -0.006em (remove) |
| Mobile heading downscale | `@media(max-width:639px)` h1 1.75 / h2 1.375 / h3 1.125rem | absent |
| H1 bottom margin | 3rem (symmetric with content pt-12=3rem) | 1.25rem |
| Content top padding | 3rem (`pt-12`) | 2.25rem |
| Body links | wt500, pad `.15em .4em`, margin-inline `-.4em`, radius .3em | no weight, pad `.05em .15em`, radius 3px |
| Inline code | translucent overlay `rgba(0,0,0,.08)` bg / `rgba(0,0,0,.15)` border, .8em, radius .2rem, hover-darkens; dark `rgba(255,255,255,.13)` | opaque `#f6f6f7`, .85em, 4px, static |
| Callouts | tip emerald-500 border / emerald-50 bg / emerald-950 text (+dark pairs); warning amber; danger red; info/note ink-strong/bg-soft | all fills bg-alt, desaturated custom-hex accents |
| Sidebar leaf (rest) | full ink `#1f1f22` | muted `--vp-text-2` |
| Sidebar pill radius | 4px | 6px |
| Sidebar padding | py-8 pr-4 (2rem / 1rem) | 1.75rem 1rem 2.5rem |
| Wordmark | 1rem wt500 | 1.05rem |
| Footer size | 13px | 0.8rem (12.8px) |
| Reduced motion | `@media(prefers-reduced-motion)` kills smooth-scroll + link transitions | absent |
| Keyboard parity | `:focus-visible` alongside every `:hover` inversion | `:hover` only |
| Wrapped-link inversion | `box-decoration-break: clone` | absent (re-check escape-safety; add if expressible) |
| Heading anchors | `#`/`##`/`###` depth markers on heading anchors | absent |

Deliberate exceptions to RE-AFFIRM (not fix) in the ticket record: local-only Inter (no Google Fonts, vendor-neutrality); plggpress's own `.tok-*` highlight theme (qmu delegates to Shiki — plgg-highlight owns this); CSS-only drawer/toggle vs qmu's React islands (zero-JS is plggpress's design).

## Policies

- `workaholic:implementation` / `policies/emergent-design-system.md` — qmu's global.css is the record of made decisions; adopt, never silently contradict
- `workaholic:implementation` / `policies/accessibility-first.md` — reduced-motion guard, :focus-visible parity, non-text contrast (knob) travel WITH the palette
- `workaholic:design` / `policies/interaction-design-standard.md` — callout family = the shared state library; adopt qmu's tinted model exactly
- `workaholic:design` / `policies/self-explanatory-ui.md` — standing underlines, heading-anchor depth markers, code badge affordances
- `workaholic:implementation` / `policies/coding-standards.md` — baseCss stays an escape-safe flat-selector CSS string (no `>`/`&`/raw `<`); hand-translate qmu's :where()/@layer/@apply; house style via plgg-coding-style; Prettier printWidth 50
- `workaholic:implementation` / `policies/directory-structure.md` — theme changes stay in `packages/plggpress/src/theme/`

## Key Files

- `packages/plggpress/src/theme/baseCss.ts` - the single stylesheet string every table row above edits
- `packages/plggpress/src/theme/*.spec.ts` - currently pin class names only, NOT values; extend to pin the corrected values (dark rgba, callout tints, media queries, focus-visible) so future drift fails tests; note `homeHero.spec.ts` still expects `vp-action`/'Get started' markup that homeHero.ts no longer renders — resolve the latent contradiction
- `/home/ec2-user/projects/qmu-co-jp/packages/astro/src/styles/global.css` - READ-ONLY oracle (tokens, prose, callouts, media queries)
- `/home/ec2-user/projects/qmu-co-jp/packages/astro/src/layouts/DocsLayout.astro`, `components/react/SidebarTree.tsx`, `components/SiteFooter.astro` - READ-ONLY layout metrics
- `packages/plggpress/src/theme/shell.spec.ts` - asserts `--vp-brand`, `.vp-app{`, `padding`, `vp-rail-social` substrings — keep or consciously update

## Related History

- [20260701211839-plgg-press-tokens-typography-match-qmu.md](.workaholic/tickets/archive/work-20260701-185044/20260701211839-plgg-press-tokens-typography-match-qmu.md) - part 1 of the original match; its Final Report lists the approximations this ticket revisits
- [20260701211840-plgg-press-sidebar-first-layout-match-qmu.md](.workaholic/tickets/archive/work-20260701-185044/20260701211840-plgg-press-sidebar-first-layout-match-qmu.md) - part 2; declared "visually close, not pixel-perfect"
- [20260702034500-plgg-press-home-sidebar-nav-reachable.md](.workaholic/tickets/archive/work-20260701-185044/20260702034500-plgg-press-home-sidebar-nav-reachable.md) - proof the match needed post-hoc correction
- Concern `51-plggpress-visual-sign-off` (active) - the reserved human visual sign-off this ticket-chain finally discharges

## Implementation Steps

1. Re-read the oracle fresh (global.css + DocsLayout/SidebarTree/SiteFooter at current HEAD of qmu-co-jp) — do not trust this table blindly; the oracle may have moved again.
2. Burn down the table in `baseCss.ts`: dark tokens to qmu's exact rgba values (+ add `--vp-knob`); font stack; heading scale/margins + the 639px downscale block; H1 3rem symmetry + content pt 3rem; link weight/hit-area; inline-code overlay badge with hover; tinted callouts with dark pairs; sidebar leaf ink/radius/padding; wordmark/footer sizes; reduced-motion guard; `:focus-visible` beside every `:hover` inversion; heading-anchor depth markers; `box-decoration-break` if expressible escape-safely.
3. Update/extend theme specs to pin the corrected values (representative assertions per group: one dark rgba, the 639px media query, `prefers-reduced-motion`, `focus-visible`, one tinted callout pair); fix the homeHero.spec latent contradiction.
4. Record the re-affirmed exceptions (Inter local-only, .tok-* theme, zero-JS controls) in this ticket's Final Report.
5. `scripts/tsc-plgg.sh`, then fresh `scripts/check-all.sh`.

## Quality Gate

Recommended defaults recorded while the developer was away — confirm at the `/drive` approval gate.

**Acceptance criteria:**

- Every row of the diff table is either fixed to qmu's exact value (verifiable by grep of baseCss.ts against the oracle values) or listed as a re-affirmed exception in the Final Report — zero silent divergences
- `prefers-reduced-motion` and `:focus-visible` rules present; callout tinted pairs present for light AND dark
- Specs pin the corrected values; the homeHero.spec contradiction is resolved
- Fresh `check-all.sh` exit 0

**Verification method:** value-grep of baseCss.ts vs the oracle list; spec run; check-all. Playwright side-by-side screenshots (light+dark × desktop+mobile) of the locally built guide vs https://qmu.co.jp are captured at the END of the ticket chain (after …052718/…052719) and presented for the developer's visual sign-off, discharging concern 51.

**Gate:** table burned down + specs green + check-all green before approval; the screenshot sign-off happens once at the chain's end.

## Considerations

- baseCss.ts is escape-safe by contract: qmu selectors using `>` child combinators must stay descendant-form; verify no regression in the escape-safety spec (`packages/plggpress/src/theme/baseCss.ts`)
- The oracle repo is READ-ONLY for this work; discrepancies resolve by changing plggpress, never qmu-co-jp
- Dark rgba values over dark backgrounds change effective contrast — spot-check WCAG AA for body/muted text after adoption (`accessibility-first`)
- The guide build's byte-oracle from earlier tickets is obsolete for this change (output SHOULD differ); the regression instrument is the spec pinning + screenshots, not byte-identity

## Final Report

Development completed as planned. The diff table burned down in baseCss.ts: dark palette adopted qmu's exact translucent inks + single divider + WCAG-tuned knob; qmu sans stack and 1.75 body leading; heading scale corrections (h4 1.0625rem, letter-spacings removed, H1 3rem symmetry with content pt 3rem, sub-640px downscale, scroll-margin 3.75rem); prose links weight 500 with qmu's hit-area and wrap-clone; :focus-visible parity on every inversion; reduced-motion guard; translucent overlay inline-code badge with hover; tinted callouts with dark pairs; sidebar leaves at full ink on 4px pills; wordmark 1rem / footer 13px. 11 new value-pinning tests (baseCss.spec.ts) lock the oracle values.

Re-affirmed exceptions: Inter local-only (vendor-neutrality, no font CDN); plggpress's own .tok-* highlight theme (plgg-highlight owns syntax color; qmu delegates to Shiki); zero-JS CSS-only controls (deliberate plggpress design vs qmu's React islands); h2/h3 margin rhythm stays hand-set (upstream is typography-plugin em-derived; not exactly reproducible without the plugin). Reassigned: heading-anchor #/##/### depth markers move to ticket 20260703052719 (they need renderer markup — plgg-md emits heading ids but no anchor links).

### Discovered Insights

- **Insight**: The discovery agent's "homeHero.spec latent contradiction" was a false alarm — the spec asserts not(toContain("vp-action")), i.e. it correctly requires actions NOT to render.
  **Context**: Negative assertions read like expectations in a grep; verify polarity before "fixing" specs.
- **Insight**: qmu's dark palette alphas (rgba over #1b1b1f) are part of the spec, not a rendering detail — the earlier opaque approximations shifted both contrast and hue subtly.
  **Context**: When porting a token system, copy the value form (alpha vs opaque), not just the perceived color.
