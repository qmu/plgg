---
created_at: 2026-05-27T17:54:26+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# Unify `match`'s non-exhaustive runtime path with the `CoverageError` vocabulary

## Overview

`match` expresses its own "no case matched" failure two contradictory ways:

- **Type level** — a non-exhaustive set of cases makes the call return
  `CoverageError<A> = Readonly<{ __nonExhaustiveMatch: A }>`
  (`src/plgg/src/Flowables/match.ts:223-225`), a non-assignable brand that
  surfaces as a compile error at the use site.
- **Runtime level** — the case loop's fallthrough does
  `return new Error("Unexpectedly no match for value: …")`
  (`match.ts:1229-1231`): a bare `Error`, neither a `Box` nor a `PlggError`,
  whose runtime shape does **not** match the declared `CoverageError<A>` type.

This is **gap #8** from the match type-completeness analysis (see Related
History). Make the runtime path consistent with the type-level vocabulary so the
two are *comparable* — the eliminator that enforces "errors as typed values"
should not itself emit an untyped, un-foldable `Error` on its failure path.

This ticket is the "bring back the comparable on the match pipeline error
definition" half of the discussion. Its sibling ticket
(`box-tagged-core-error-face-for-match`) makes domain errors match-compatible;
the two share one error vocabulary but touch disjoint files and can land in
either order.

## Key Files

- `src/plgg/src/Flowables/match.ts` - `CoverageError<A>` type (lines 223-225);
  the runtime case loop and its `new Error(...)` fallthrough (lines ~1193-1232);
  the `MatchCont<A>` overloads that already return `CoverageError<A>` when
  `ArgMatchable` resolves to `never`.
- `src/plgg/src/Exceptionals/PlggError.ts` - `unreachable(): never` (throws
  `"Supposed to be unreachable"`), the existing sanctioned escape hatch; decide
  whether the fallthrough should `unreachable()` or return a value.
- `src/plgg/src/Contextuals/Box.ts` / `Icon.ts` / `UntaggedBox.ts` - the
  `box(tag)(content)` idiom; `UntaggedBox`/`untaggedBox` is precedent for
  wrapping an arbitrary value into a `Box`. A runtime `CoverageError` value would
  follow this shape.
- `src/plgg/src/Flowables/match.spec.ts`, `match.completeness.spec.ts` - the
  type-level exhaustiveness assertions and runtime tests that pin the contract;
  the fallthrough branch (currently bare `Error`) needs explicit coverage.
- `docs/match-type-completeness.md` - the canonical gap reference produced by the
  gap-analysis ticket; gap #8 is this work. Update it when the gap is closed.

## Related History

The match exhaustiveness model and the `CoverageError` brand were built across a
three-ticket lineage; this closes the one gap that lineage explicitly left open.

- [20260525205926-match-type-completeness-gap-analysis.md](.workaholic/tickets/archive/work-20260513-182057/20260525205926-match-type-completeness-gap-analysis.md) - Inventoried 8 completeness gaps; **gap #8 ("runtime no-match returns an Error value typed as R") is verbatim this ticket**. Produced `docs/match-type-completeness.md`.
- [20260526210115-match-narrowed-box-handler-and-atomic-coverage.md](.workaholic/tickets/archive/work-20260513-182057/20260526210115-match-narrowed-box-handler-and-atomic-coverage.md) - Curried `match`, introduced the exported `CoverageError<A>` return vocabulary, but left the runtime `new Error(...)` in place (the residual seam this ticket removes). Same file.
- [20260527023825-http-failure-vocabulary.md](.workaholic/tickets/archive/work-20260513-182057/20260527023825-http-failure-vocabulary.md) - The `HttpError` Box union folded by a hand-rolled ternary with no exhaustiveness guard — illustrates why match's own error path must be trustworthy.

## Implementation Steps

1. Decide the fallthrough contract. Two candidates, both consistent with the
   type level:
   - **(a) Value:** return a `CoverageError<A>`-shaped value — i.e. a `Box`
     carrying the unmatched value (e.g. `box("CoverageError")(a)` or an object
     `{ __nonExhaustiveMatch: a }` that satisfies the existing type). Preserves
     "errors as values"; the branch is type-unreachable in well-typed code but
     becomes a faithful value if reached (e.g. via untyped callers).
   - **(b) Throw:** call `unreachable()` (`PlggError.ts`) since the type system
     already proves the branch unreachable. Simpler, but trades a value for a
     throw at a seam the type contract says cannot happen.
   Prefer **(a)** unless review favors the unreachable-throw — it keeps match's
   runtime output assignable to its declared `CoverageError<A>` return type and
   avoids a bare `Error`. Capture the decision in the ticket discussion.
2. Implement the chosen path at `match.ts:1229-1231`, ensuring the runtime value
   is structurally assignable to `CoverageError<A>` (no `as`/`any`/`@ts-ignore`).
   If choosing a `Box` form, confirm it still satisfies the `CoverageError<A>`
   type or widen `CoverageError` to that shape — keeping `CoverageError` as the
   single exhaustiveness term (ubiquitous language).
3. Add/adjust a runtime test in `match.spec.ts` that drives the fallthrough
   (an untyped/forced non-match) and asserts the new shape; keep
   `match.completeness.spec.ts` green.
4. Update `docs/match-type-completeness.md` to mark gap #8 closed.
5. Verify with `sh/tsc-plgg.sh` and `sh/test-plgg.sh`; keep coverage > 90%.
   Rebuild `src/plgg` (`npm run build`) so downstream worktrees see any
   `CoverageError` export change.

## Considerations

- **Type-driven design lens (`standards:leading-validity`).** The fix must keep
  exhaustiveness *unrepresentable to violate* at the type level; the runtime
  change is about faithfulness of the (type-unreachable) escape value, not about
  loosening the compile-time guarantee (`src/plgg/src/Flowables/match.ts`).
- **Ubiquitous language.** `CoverageError` must remain the *single* term for
  non-exhaustiveness across type and runtime — do not coin a second name
  (`match.ts`).
- **No `as`/`any`/`@ts-ignore`** (CLAUDE.md). The runtime value must satisfy
  `CoverageError<A>` structurally.
- **Public-surface impact.** `CoverageError` is exported and consumers may rely
  on its shape; if option (a) changes the shape, treat it as a deliberate pre-1.0
  contract change (the curried-`match` change set this precedent) and update
  `match.completeness.spec.ts` accordingly.
- **Sibling ticket.** `box-tagged-core-error-face-for-match` makes domain errors
  (InvalidError/PlggError) match-foldable; keep the `Box` vocabulary chosen here
  consistent with that ticket so the two error worlds share one expression.
