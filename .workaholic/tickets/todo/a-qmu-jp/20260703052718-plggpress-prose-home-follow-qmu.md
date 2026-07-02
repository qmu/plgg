---
created_at: 2026-07-03T05:27:18+09:00
author: a@qmu.jp
type: refactoring
layer: [UX]
effort:
commit_hash:
category:
depends_on: [20260703052717-plggpress-reconcile-tokens-a11y-qmu-oracle.md]
---

# Follow the oracle's landing model: prose home, retire the hero/feature grid

## Overview

qmu.co.jp's landing page is now ordinary markdown prose rendered through the same docs layout (`pages/index.astro` → `docs/index.md`: an H1 tagline plus `## [link](/…)` sections) — there is no hero component and no feature-card grid. plggpress still ships `.vp-hero` + `.vp-features` (homeHero.ts) as its landing model, and the guide's home uses it. Follow the oracle: the default theme's home becomes prose through the standard shell (sidebar included, as fixed in 20260702034500), the hero/feature-grid component and its baseCss styles are retired, and the guide's home content is rewritten as markdown prose in qmu's landing idiom.

Scope decision (recommended default recorded while the developer was away — confirm at the `/drive` gate): full fidelity — retire the hero rather than keep it as an optional plggpress feature. qmu's 404 is also plain DocsLayout prose; retire the bespoke `.vp-notfound` styling in the same stroke.

## Policies

- `workaholic:implementation` / `policies/emergent-design-system.md` — the oracle's landing model changed; the downstream theme adopts the new decision rather than preserving the stale one
- `workaholic:design` / `policies/self-explanatory-ui.md` — the prose home keeps every article reachable through the same sidebar shell; no special-case landing navigation
- `workaholic:implementation` / `policies/coding-standards.md` — house style; removal must leave no dead classes in baseCss or dead exports in the theme barrel
- `workaholic:implementation` / `policies/directory-structure.md` — theme components in `packages/plggpress/src/theme/`, guide content in `packages/guide/`

## Key Files

- `packages/plggpress/src/theme/homeHero.ts` + `homeHero.spec.ts` - the component to retire (spec already carries a latent contradiction — expects action markup the component stopped rendering)
- `packages/plggpress/src/theme/page.ts` - the `layout: home` branch: renders the prose body through the standard shell instead of the hero
- `packages/plggpress/src/theme/notFound.ts` + `notFound.spec.ts` - restyle as plain prose (qmu's 404 model), keep the route
- `packages/plggpress/src/theme/baseCss.ts` - remove `.vp-hero` / `.vp-features` / `.vp-notfound` blocks (after ticket …052717's edits land — shared file, hence depends_on)
- `packages/guide/index.md` (or the guide's home content file) - rewrite as qmu-idiom prose: H1 tagline + linked `##` sections into Guide/Packages
- `packages/plggpress/src/SiteConfig/` - check whether the home/hero fields of SiteConfig (defineSite) become dead vocabulary; if so remove them (breaking changes OK — plgg is its own only consumer) and update the config validator + its specs

## Related History

- [20260702034500-plgg-press-home-sidebar-nav-reachable.md](.workaholic/tickets/archive/work-20260701-185044/20260702034500-plgg-press-home-sidebar-nav-reachable.md) - already gave the home the sidebar shell; this ticket completes the convergence (home = ordinary page)
- [20260701195048-defineSite-typed-author-facing-input.md](.workaholic/tickets/archive/work-20260701-185044/20260701195048-defineSite-typed-author-facing-input.md) - the typed SiteConfig this ticket may shrink (hero/home data fields)

## Implementation Steps

1. Verify the oracle's current landing (qmu-co-jp `pages/index.astro` + `docs/index.md`) — confirm prose-through-DocsLayout is still its model.
2. Rewrite the guide's home content as prose in that idiom (tagline H1, linked `##` sections); keep frontmatter minimal.
3. Change page.ts's home branch to render the markdown body through the standard shell; delete homeHero.ts and its spec; remove the hero/features/notfound styles from baseCss.ts; restyle notFound.ts as prose.
4. Sweep SiteConfig for now-dead home/hero fields; remove them and update defineSite/asSiteConfig + specs if dead (or record why they stay).
5. Update page.spec.ts assertions (vp-home structure changes); run `scripts/tsc-plgg.sh` then fresh `scripts/check-all.sh`; rebuild the guide and eyeball the home locally.

## Quality Gate

Recommended defaults recorded while the developer was away — confirm at the `/drive` approval gate.

**Acceptance criteria:**

- `grep -rn "vp-hero\|vp-features" packages/` returns nothing (component, styles, and specs all gone)
- The guide's home renders as prose through the standard shell with the sidebar present, matching qmu's landing idiom; the 404 renders as plain prose
- No dead SiteConfig vocabulary remains (or the retention is recorded)
- Fresh `check-all.sh` exit 0 (includes the guide build and its dead-link checker)

**Verification method:** the greps above; check-all; the built guide's home/404 HTML inspected; the chain-end Playwright screenshots include the home page pair.

**Gate:** greps clean + check-all green before approval; visual confirmation rides the chain-end screenshot sign-off.

## Considerations

- This is a visible breaking change to the guide's landing page — deliberate oracle-following, recorded here (breaking changes OK: plgg is its own only consumer)
- homeHero removal must not orphan `collectCss` styles or the theme barrel exports (`packages/plggpress/src/index.ts`)
- If the guide's home content relies on hero-only data (taglines, action buttons), that content moves INTO the prose — nothing is silently dropped
