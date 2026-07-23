---
created_at: 2026-07-23T00:50:10+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash:
category: Added
depends_on: []
mission: grow-plggmatic-as-the-reference-framework
---

# Generalize the unbounded-depth horizontal runway into the framework

## Overview

The reference's central claim — the column strip expanding rightward
with the body width invariant ("depth does not consume the viewport",
8 columns / 1751px at 420×640) — is produced by **app-owned overrides
in demo1**, not by framework code: `demo1/styles.ts:22-56` overrides
`.pm-row` to scroll at every width, and `demo1/logic.ts`'s
`advanceColumnsCmd` measures the last column, publishes `--bo-last`,
and horizontal-scrolls the new column to the left edge. The framework
(`chromeCss.ts`) only ships this below the `snap` breakpoint. Make the
unbounded-depth runway a **declared framework capability** the
reference consumes, rather than special-cased app logic.

## Key files

- `packages/plggmatic-example/src/demo1/styles.ts:22-56,91-122` — the
  app-owned desktop runway + per-content column widths + `--bo-last`
  math.
- `packages/plggmatic-example/src/demo1/logic.ts:135,169-210`
  (`advanceColumnsCmd`) — the DOM-measuring column-advance effect.
- `packages/plggmatic/src/Render/usecase/multiColumn.ts:107-147`
  (`multiColumn`/`multiColumnWith`), `src/Style/usecase/chromeCss.ts:48-77`,
  `src/Style/model/breakpoint.ts:26` — the framework layout/behaviour
  to extend with a declared runway option.

## Approach

- Add a declared option on the `multiColumn` layout (e.g. an
  unbounded-depth / "advance columns" mode) so the framework emits the
  scroll-at-every-width runway and owns the column-advance effect
  (measure last column → runway spacer → scroll new column to left
  edge), parameterised, not hard-coded.
- Migrate demo1 to enable the framework option and **remove the
  app-owned runway overrides and the `advanceColumnsCmd` DOM effect**
  (or reduce them to configuration).
- Preserve the regression property: the strip reaches its columns with
  the body/top-bar width invariant.

## Quality Gate

- **Acceptance:** demo1 produces the same rightward-expanding strip
  through the framework runway option (its app-owned runway overrides
  and DOM-measuring advance effect removed or reduced to config); a
  regression test asserts the "depth does not consume the viewport"
  property — the body/top-bar width stays fixed while the column strip
  grows and scrolls horizontally.
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:implementation` / `sacrificial-architecture` — the
  reference's central claim must be a framework capability, not
  app-owned logic that drifts from the framework.
- `workaholic:design` — "depth does not consume the viewport" is the
  horizontal-orientation invariant this capability guarantees.

## Final Report

Made the unbounded-depth horizontal runway a declared framework
capability the reference merely enables.

**Framework (`packages/plggmatic`):**
- `Style/usecase/runwayCss.ts` — `runwayCss(theme)(opts)`: emits the
  scroll-at-every-width `.<p>-row` runway (was app-owned, framework
  chrome only ships it below `snap`) and the `min-width:snap` trailing
  `::after` FLEX SPACER sized `calc(100% - var(--<p>-runway-last,…) -
  gap)`. Parameterised by `RunwayOptions` (`gap`, `lastFallback`) and the
  theme prefix; escape-safe. 100% coverage.
- `Render/usecase/advanceColumns.ts` — `advanceColumns(theme)(done)`:
  the seek-head-scroll Cmd that owns the runway — measures the last
  column, publishes `--<p>-runway-last`, scrolls the newest column into
  view (left edge below `snap`, centred above). A faithful relocation of
  the demo's DOM effect, parameterised by the prefix; coverage-excluded
  as a thin DOM-integration effect (a no-op without `document`).
- Three `rowCol*` component slots added so a consumer declares
  per-content column WIDTHS through the framework's row/col surface, not
  by naming `.pm-row .pm-col`. Exported via `Style`/`styleEntry`
  (`runwayCss`) and `Render`/root (`advanceColumns`).

**Reference (`packages/plggmatic-example`):**
- `demo1/theme.ts` — `demo1Runway` options + the per-column widths as
  `rowCol` slots.
- `demo1/styles.ts` — the `.pm-row` runway override, the `@media`
  desktop spacer, and the per-column widths removed; **zero `.pm-`
  selectors remain** (grep-verified — the ticket's headline acceptance,
  reached jointly with the theming-slots ticket).
- `demo1/logic.ts` — the ~85-line DOM `advanceColumnsCmd` reduced to a
  one-line call of the framework `advanceColumns(demo1Theme)`.
- `demo1-main.ts` — injects `runwayCss(demo1Theme)(demo1Runway)`.

**Verification:** the "depth does not consume the viewport" invariant is
asserted STRUCTURALLY in `runwayCss.spec.ts` — the strip is a horizontal
scroll container (added columns grow scroll width, not the row/body
width) and the runway is a trailing `::after` flex spacer sized one
column short. (A true pixel measurement — the "8 columns / 1751px at
420×640" figure — needs a real layout engine, which plgg-test's DOM does
not provide; the CSS mechanism that guarantees the invariant is what is
tested.) A full rule-set reconstruction diff proved
`slotCss + runwayCss + demo1Css` emits the **identical 75-rule set** as
the pre-refactor stylesheet (modulo the intentional, behaviour-preserving
`--bo-*` → `--pm-runway-*` internal-var rename) — visual identity by
construction. `./scripts/check-all.sh` green; plggmatic coverage >90%;
no `as`/`any`/`ts-ignore`.
