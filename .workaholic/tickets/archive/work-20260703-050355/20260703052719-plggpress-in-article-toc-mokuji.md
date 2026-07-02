---
created_at: 2026-07-03T05:27:19+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 1h
commit_hash: 954ebc4
category: Changed
depends_on: [20260703052717-plggpress-reconcile-tokens-a11y-qmu-oracle.md]
---

# Port qmu's in-article collapsible 目次 (table of contents) to plggpress

## Overview

qmu.co.jp renders an in-article collapsible 目次 — a `<details>/<summary>` block listing the page's headings — inside the prose flow (its `.prose .mobile-toc` styling in global.css; heading data flows from the content through the layout). plggpress renders no TOC at all; the original match deferred it explicitly. Port the **in-article variant only** (works at every width, no JS): heading extraction plumbed from the markdown pipeline into the page renderer, a details/summary TOC block at the top of the article, and the oracle's styling re-expressed escape-safely. The xl right-rail Toc stays deferred (recorded divergence).

Scope decision (recommended default recorded while the developer was away — confirm at the `/drive` gate): in-article 目次 only; right rail deferred.

## Policies

- `workaholic:design` / `policies/self-explanatory-ui.md` — the TOC exposes document structure from the element itself; depth markers and heading anchors (ticket …052717) pair with it
- `workaholic:implementation` / `policies/domain-layer-separation.md` — heading extraction is a pure domain fold over the markdown AST (plgg-md vocabulary), not a renderer-side regex; the theme consumes a typed heading list
- `workaholic:implementation` / `policies/accessibility-first.md` — native `<details>/<summary>` keeps it keyboard-operable for free; respect reduced-motion for any open/close animation (qmu animates via `interpolate-size` — adopt only with the reduced-motion guard from …052717)
- `workaholic:implementation` / `policies/coding-standards.md` + `policies/directory-structure.md` — universal; plgg-view element builders (details/summary if missing must be added to plgg-view's Html vocabulary, reaching plggpress through the plggmatic facade)

## Key Files

- `packages/plgg-md/src/` - the markdown AST: add (or expose) a pure heading-extraction fold `MarkdownDoc → ReadonlyArray<Heading>` (depth, text, slug — slugs must match the heading anchors the renderer emits)
- `packages/plgg-view/src/Html/` - check for `details`/`summary` element builders; add them if missing (they flow to plggpress via the plggmatic facade re-exports — rebuild plggmatic's dist after)
- `packages/plggmatic/src/index.ts` - no change expected (star re-exports pick up new plgg-view/plgg-md exports); verify with the facade probe pattern from ticket 20260703000541
- `packages/plggpress/src/router/pressRouter.ts` / `theme/page.ts` - thread the heading list into the article render; emit the 目次 block above the body for pages with ≥2 headings
- `packages/plggpress/src/theme/baseCss.ts` - the `.vp-toc` styles re-expressed from qmu's `.mobile-toc` (escape-safe, after …052717 lands — shared file)
- `/home/ec2-user/projects/qmu-co-jp/packages/astro/src/styles/global.css` - READ-ONLY oracle for the 目次 styling

## Related History

- [20260701211840-plgg-press-sidebar-first-layout-match-qmu.md](.workaholic/tickets/archive/work-20260701-185044/20260701211840-plgg-press-sidebar-first-layout-match-qmu.md) - deferred the TOC as out-of-scope; this ticket closes that recorded gap
- [20260703000541-thicken-plggmatic-reexport-facade.md](.workaholic/tickets/archive/work-20260701-185044/20260703000541-thicken-plggmatic-reexport-facade.md) - the facade any new plgg-view/plgg-md exports travel through; its symbol-identity probe is the verification pattern

## Implementation Steps

1. Read qmu's 目次 markup + styling fresh (global.css `.mobile-toc`, the layout's heading wiring) as the porting reference.
2. plgg-md: pure heading extraction (model type + usecase fold), with slugs identical to the renderer's heading-anchor ids; >90% coverage on the new code.
3. plgg-view: add `details`/`summary` builders if absent (mirror existing element-builder style + specs); rebuild dists (plgg-view → plggmatic) so the facade re-exports them.
4. plggpress: thread headings through the page render; emit the collapsible 目次 (summary label 目次) above the article body when ≥2 headings; style `.vp-toc` from the oracle escape-safely; suppress on the prose home if noisy (match the oracle's behavior).
5. Specs: heading extraction unit tests (plgg-md), builder tests (plgg-view), page.spec assertions for the TOC block presence/absence and anchor hrefs.
6. `scripts/tsc-plgg.sh`, fresh `scripts/check-all.sh`, rebuild the guide and click through TOC anchors locally.

## Quality Gate

Recommended defaults recorded while the developer was away — confirm at the `/drive` approval gate.

**Acceptance criteria:**

- Articles with ≥2 headings render a collapsible 目次 whose links jump to the matching heading anchors (slug parity is spec-asserted, not assumed)
- The TOC is a native `<details>/<summary>` (keyboard-operable), styled per the oracle, with any animation behind the reduced-motion guard
- New plgg-md/plgg-view code holds the >90% coverage gates; the facade probe confirms the new symbols resolve via plggmatic
- Fresh `check-all.sh` exit 0; guide dead-link checker green (TOC anchors count as internal links)

**Verification method:** unit specs (slug parity, extraction, builders), the facade probe, check-all, and a manual anchor click-through on the built guide; the chain-end Playwright screenshots include an article with the 目次 open and closed.

**Gate:** specs + check-all green and anchor click-through verified before approval; visual confirmation rides the chain-end screenshot sign-off.

## Considerations

- Slug generation is the coupling point: if plgg-md's heading-anchor ids and the TOC's hrefs are computed in two places they WILL drift — single-source the slugger (`packages/plgg-md/src/`)
- The xl right-rail Toc remains a recorded divergence from the oracle (defer; revisit if the in-article variant proves insufficient)
- `interpolate-size` is new CSS — verify it degrades gracefully (instant open/close) in browsers without it; never gate functionality on it
- After plgg-view/plgg-md changes, stale dists mask consumer drift — fresh check-all is mandatory, and plggmatic's dist must be rebuilt for the facade to expose the new builders (`scripts/check-all.sh`)

## Final Report

Development completed as planned. plgg-md's MarkdownDoc gained a typed `headings` list (MdHeading: level + text + slug) produced by ONE slugger run that `slugs` now derives from — parity by construction, spec-asserted incl. duplicate-slug dedup and callout/quote nesting. plgg-view needed nothing: `details`/`summary` builders already existed with a typed content model, and the plggmatic facade exposed both the new type and the builders without changes (star re-exports; probe-verified). plggpress renders the collapsible 目次 above the article body when a page has ≥2 section headings (h2–h4; the h1 title is excluded), styled from the oracle's mobile-toc with the interpolate-size open/close animation behind @supports + the reduced-motion guard. The guide's dead-link checker validates every TOC fragment against the emitted heading ids, so anchor integrity is enforced at build time forever.

### Recorded divergences

- The 目次 sits at the top of the prose column (above the H1) rather than qmu's after-the-H1 position: the rendered body is an opaque typed tree with no splice point. Revisit if plgg-view ever grows a tree-surgery combinator.
- The xl right-rail Toc stays deferred, as scoped.

### Discovered Insights

- **Insight**: Deriving `slugs` FROM `headings` (rather than running two parallel collectors) made the lock-step guarantee structural instead of disciplinary — the two lists cannot drift because one is a projection of the other.
  **Context**: When two data surfaces must agree, make one derive from the other; parallel computation + a comment is how they drift.
- **Insight**: plgg-view's typed content models (DetailsContent = one summary + Flow) forced the TOC's return type to carry its tag (`Html<never, "details">`) — a generic `Html<never>` annotation erases the tag and fails Flow assignment.
  **Context**: In tag-typed element trees, over-widening a return annotation is the compile error; keep builders' natural narrow types.
