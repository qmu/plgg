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
