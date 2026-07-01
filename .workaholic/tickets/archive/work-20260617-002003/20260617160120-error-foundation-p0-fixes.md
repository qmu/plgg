---
created_at: 2026-06-17T16:01:20+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort: 2h
commit_hash: 26146a1
category: Changed
depends_on:
---

# P0 error-foundation fixes: printPlggError cycle crash + bind/tryCatch raw Error

## Overview

Two P0 defects in the error foundation, surfaced by the higher-perspective
review of the errors-as-data redesign. Both sit in the core error path the SSG
feature will build on, so they land before SSG.

1. **`printPlggError` infinite-loops on a sibling/cause cycle.** `walk`/`childrenOf`
   recurse with no visited-set or depth cap, and `box()` does not freeze content,
   so a self-referential `InvalidError.sibling` (or cause) cycle is constructible
   and was reproduced (RangeError after ~2182 `console.error` calls). A
   pretty-printer that crashes the process while *reporting* an error is the
   worst-case failure.
2. **`bind` and `tryCatch` still mint raw `new Error`** — violating the
   redesign's invariant that expected failures are pure data and only `Defect`
   carries a real `Error`. `bind` returns `Result<object, Error>` and wraps a
   non-`Error` failure in `new Error(String(...))`; `tryCatch`'s default handler
   synthesizes `new Error("Operation failed: …")`. Worse, `tryCatch` carries
   **four pre-existing `as` casts** (`as unknown as E` ×2, `as U` ×2) in the very
   seam that defines the model — a direct violation of the strict no-`as` rule.
   Any `proc` chain containing a `bind`/`tryCatch` step re-injects a stackful raw
   `Error` into a union the redesign promises is data.

## Key Files

- `packages/plgg/src/Exceptionals/PlggError.ts` - `walk`/`childrenOf` (~lines
  58–114): add a visited-set (and a depth cap as backstop).
- `packages/plgg/src/Functionals/bind.ts` (~lines 191, 202–206) - make generic
  over `E`; return `Result<object, E>`; pass a bare-value failure through as data
  (or wrap in `Defect`) instead of `new Error(String(...))`.
- `packages/plgg/src/Functionals/tryCatch.ts` (lines ~30–48) - default the error
  channel to `defect(...)`; remove the four `as` casts by tightening the
  overloads so the implementation narrowing is provable.

## Implementation Steps

1. **`printPlggError` cycle guard.** Thread a `WeakSet<object>` of visited error
   nodes through `walk`; on revisit, print ` - <cycle>` and return. Optionally
   add a max-depth backstop. Spec: build a 2-node `InvalidError` sibling cycle
   and assert `printPlggError` terminates and emits a `<cycle>` line.
2. **`bind` off raw `Error`.** Generalize the error channel to `E`; route a
   bare-value failure through as data (prefer `Defect` for a genuinely
   unexpected non-`Result` value). Re-verify `bind.spec.ts` (note: a pre-existing
   `result.content as Error` there relied on `bind` carrying `Error` — adjust the
   spec to the data model rather than re-introducing `Error`; no new `as`).
3. **`tryCatch` off raw `Error` + drop casts.** Default `errorHandler` to
   `(e) => defect("Operation failed", e)`; tighten the sync/async overloads so the
   implementation's `ok(value)`/`err(...)` are provably typed without `as U` /
   `as unknown as E`. If an overload genuinely cannot be expressed without a
   cast, restructure the implementation (e.g. split sync/async bodies) — do not
   keep the cast.
4. Close the loop: `scripts/tsc-plgg.sh` clean, `scripts/check-all.sh` green
   (these are core combinators — verify downstream `proc`/`tryCatch`/`bind` users
   in plgg-sql/foundry/kit still type-check); rebuild `plgg`. Coverage >90%.

## Considerations

- **`tryCatch`'s casts are the crux.** They exist because the default handler
  returns `Error` while `E` is generic. Defaulting to `Defect` and splitting the
  sync/async implementation paths should let the narrowing be provable. The
  no-`as` rule is non-negotiable; restructure until it holds.
  (`packages/plgg/src/Functionals/tryCatch.ts`)
- **Behavior preservation.** `bind`/`tryCatch` are widely used; the *shape* of
  success results must not change, only the error channel. Drive off `check-all`.
- **Relationship to the data model.** After this, every throw-to-data boundary
  (`proc`, `cast` [see the P1 ticket], `tryCatch`) routes an unexpected throw to
  `Defect` uniformly — the model holds at every seam.
  ([[20260617160121-error-foundation-p1-hardening]])

## Final Report

Development completed. Full repo green via `scripts/check-all.sh` (all packages;
plgg 460 tests incl. the new cycle-guard test). **Net −5 `as` casts** (4 removed
from `tryCatch`, 1 from `bind.spec`); zero escape hatches added.

### Discovered Insights

- **Insight**: `tryCatch`'s four `as` casts were removed by **fixing `E=Defect`
  at the no-handler overloads** and unioning `E | Defect` in the implementation.
  **Context**: the casts existed because a generic-`E` default handler can't
  produce a concrete `Defect` without one. Splitting into no-handler overloads
  (which pin `E=Defect`) and handler overloads (generic `E`), with an impl that
  returns `Result<U, E | Defect>`, makes every `ok`/`err` provably typed —
  TypeScript trusts the narrower public overloads over the wider impl return.
- **Insight**: `tryCatch`'s overloads must list **async before sync**.
  **Context**: `(arg) => U` greedily matches a `Promise`-returning `fn` with
  `U = Promise<…>` (never flattening), so the async overload must come first; a
  sync `fn`'s return isn't assignable to `Promise<U>`, so it correctly falls
  through. This surfaced as a foundry break (`operate.ts` switcher fn typed
  `PossiblyPromise<[boolean, unknown]>`), fixed by reordering + normalizing the
  call site to a `Promise`.
- **Insight**: `bind` now passes a failure through as data (`unknown` channel)
  rather than `new Error(String(...))`.
  **Context**: a `proc` chain containing a `bind` step no longer re-injects a
  raw stackful `Error` into the error union — the model ("only `Defect` carries
  an `Error`") now holds through `bind`.
