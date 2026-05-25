---
created_at: 2026-05-25T20:59:26+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# Identify and Propose Type-Level Completeness Fixes for `match`

## Overview

The `match` function in `plgg` provides type-directed pattern matching over atomics, booleans, boxed variants (tag/atomic/object patterns), and an `otherwise` sentinel. Its type machinery (`ArgMatchable`, `CaseDecl`, `FullCoveragedBoxes`, the per-arity overloads) catches *some* exhaustiveness violations by collapsing the first argument's accepted type to `never` when patterns do not fully cover the input union `A`. However, the coverage model is narrow and several classes of pattern-matching inconsistency pass type-checking today.

This ticket's first deliverable is a **gap analysis**: enumerate the pattern-matching inconsistencies the current types CANNOT detect, each backed by a minimal reproducing snippet (a `match` call that compiles but should not, or that produces `never`/`Error` where it should not). The second deliverable is a **set of type-level fix proposals** for each gap, with trade-offs, scoped against the repo's hard constraint that `as`, `any`, and `@ts-ignore` are prohibited as solutions to type errors.

This is an analysis-and-proposal ticket. It does NOT mandate shipping every fix; it must produce the inventory of gaps and concrete, compile-checked recommendations. Implementing the chosen fixes can follow as dependent tickets.

## Key Files

- `src/plgg/src/Flowables/match.ts` - Defines `match`, its 19 arity overloads (P1~P2 through P1~P20), and the type-level coverage machinery: `ArgMatchable`, `CaseDecl`, `FullCoveragedBoxes`, `ExtractBoxTag`, `ExtractPatternTags`, `AreAllTagPatterns`, `IsAllAtomic`, `IsAllBoxPattern`, plus the runtime implementation and `deepPartialEqual`.
- `src/plgg/src/Flowables/match.spec.ts` - Existing behavioral tests for number/string/boolean atomics, variants, and Result/Option matching. Inline comments mark cases that "should compile error" — the basis for negative type tests.
- `src/plgg/src/Contextuals/Pattern.ts` - `pattern()` factory and the three pattern shapes (`PatternAtomic`, `PatternBoxedObject`, `PatternIcon`) with their `IsPattern*` predicates and `ExtractBodyFromBoxPattern`. Pattern classification drives which coverage branch `ArgMatchable` takes.
- `src/plgg/src/Grammaticals/BoolAlgebra.ts` - `If`, `Is`, `IsEqual`, `And`, `Or`, `TupleToUnion`, `IsUnionSubset`, and the `otherwise` sentinel constant. The exhaustiveness logic is built from these.
- `src/plgg/src/Disjunctives/Atomic.ts` - `Atomic` type and `IsAtomic` predicate used to classify atomic patterns.
- `src/plgg/src/Contextuals/Box.ts` - `Box<Tag, Content>` shape that variant matching destructures via `__tag`/`content`.

## Related History

Past work in this area is limited to documentation; no ticket has previously addressed the type-level completeness of `match`, so this is a clear (non-duplicate) addition.

Past tickets that touched similar areas:

- [20260226053744-make-comprehensive-readme.md](.workaholic/tickets/archive/drive-20260226-032733/20260226053744-make-comprehensive-readme.md) - Documented `match` and Result/Option pattern matching in the README (same function, documentation-only — does not touch the type machinery).

## Implementation Steps

1. **Map the current coverage model.** Document how `ArgMatchable<PATTERNS, OTHERWISE_LAST, A>` routes each match call into one of four branches: (a) `boolean` input requires patterns to be exactly the tuple `[true, false]`; (b) all-box-pattern inputs go through `FullCoveragedBoxes` (tag-subset coverage); (c) all-atomic inputs require `IsEqual<TupleToUnion<PATTERNS>, A>` or an `otherwise` whose union is a superset; (d) everything else falls back to `If<OTHERWISE_LAST, A, never>` (no real check unless `otherwise` is present). Note that `OTHERWISE_LAST` is derived only from whether the LAST pattern is the `otherwise` sentinel, and that `PATTERNS` excludes the trailing `otherwise` when present.

2. **Enumerate gaps with reproducing snippets.** For each gap below, write a minimal `match` call demonstrating that the type system fails to flag the inconsistency (or wrongly produces `never`). Candidate gaps identified during discovery:
   - **Duplicate / overlapping atomic patterns are invisible.** Atomic coverage uses `IsEqual<TupleToUnion<PATTERNS>, A>`; `TupleToUnion` collapses duplicates, so `[s1, () => ...]` repeated, or `[s1, ...]` plus a redundant `[s1, ...]`, still yields the same union and passes. Unreachable duplicate branches are not detected.
   - **Boolean exhaustiveness is order- and shape-rigid.** `If<Is<PATTERNS, [true, false]>, A, never>` only accepts the exact tuple `[true, false]`. The semantically-equivalent `[FALSE, TRUE]` (`[false, true]`), a duplicated `[true, true]`, or a `boolean` match closed with `otherwise` collapse to `never`. Confirm and document whether this is a false-negative-prevention or an over-restriction (false positive).
   - **Mid-list `otherwise` is undetected.** `OTHERWISE_LAST` only inspects the final pattern. An `otherwise` placed before other cases makes all subsequent branches unreachable at runtime, yet compiles.
   - **Object-body (`PatternBoxedObject`) patterns disable box exhaustiveness.** `FullCoveragedBoxes` requires `AreAllTagPatterns`; a single `ast$({ type: "root" })`-style object pattern makes the whole match fall back to requiring `otherwise`, so genuine variant exhaustiveness over object patterns is never proven.
   - **Mixed pattern families bypass exhaustiveness.** A match combining atomic, tag, and object patterns falls into branch (d) and is only "checked" via the presence of a trailing `otherwise`.
   - **Wrong / foreign discriminant tags are not rejected at the case level.** `CaseDecl` for boxed input validates body compatibility (`PBODY` vs `ABODY`) but does not reject a `PatternIcon` whose `__tag` is not a member of `A`'s tag union; the mismatch only ever surfaces (if at all) in aggregate coverage.
   - **Per-branch return-type mismatches are silently unioned.** All `CaseDecl<A, Pn, R>` share one `R`; heterogeneous handler return types widen `R` into a union rather than being flagged. Document whether divergent return types should be an error or are intended.
   - **Runtime no-match returns an `Error` value typed as `R`.** The runtime implementation `return new Error(...)` on no match, but the declared return type is `R`. A non-exhaustive runtime path produces an `Error` masquerading as `R` — a type/runtime contract gap to call out even if the fix is runtime (throw) rather than type-level.

3. **Classify each gap.** For every confirmed gap, label it as a *false negative* (unsound — should reject but compiles) or a *false positive / over-restriction* (rejects or yields `never` for a valid match, e.g. the boolean tuple rigidity). Prioritize false negatives, since they are unsoundness.

4. **Draft type-level fix proposals.** For each gap, propose a concrete type-level mechanism and sketch the change against the existing helpers. Examples to evaluate: a `HasDuplicate<PATTERNS>` / pairwise-overlap recursive helper to flag duplicate or subsuming patterns; relaxing boolean coverage to an order-independent set check built on `IsUnionSubset` over `{ true, false }`; an `OtherwiseOnlyLast<PATTERNS>` guard that rejects `otherwise` anywhere but the final slot; extending `FullCoveragedBoxes` to incorporate object-pattern discriminants; a `TagsSubsetOf<A>` constraint inside `CaseDecl` for `PatternIcon`. Each proposal must compile under the strict flags WITHOUT `as`/`any`/`@ts-ignore`.

5. **Record proposals as a written analysis in the ticket follow-up / PR description**, and add negative type tests (compile-error fixtures) that encode the desired behavior. Because the repo prohibits `@ts-ignore`, negative type assertions must use a type-level expectation pattern (e.g. asserting the first argument's accepted type narrows to `never`, or `IsEqual`-based static assertions) rather than `// @ts-expect-error`.

6. **Verify** with `sh/tsc-plgg.sh` (must exit 0) and `sh/test-plgg.sh`. Keep coverage above the strict >90% statements/branches/functions/lines thresholds; any new runtime branch (e.g. changing the no-match behavior) must be exercised by tests.

## Considerations

- **Hard constraint — no type escape hatches.** Every proposed fix and every negative test must compile without `as`, `any`, or `@ts-ignore`. This rules out `// @ts-expect-error`-style negative tests; encode expected rejection via type-level assertions that the accepted argument type collapses to `never` (`.workaholic/constraints/quality.md` Type Escape Prohibition; `CLAUDE.md`).
- **Strict compiler flags are fixed.** The analysis must hold under `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`, `isolatedModules` (`.workaholic/constraints/architecture.md` TypeScript Strictness Configuration; `.workaholic/constraints/quality.md` TypeScript Strict Mode). `erasableSyntaxOnly` constrains runtime-side fixes.
- **Type-driven design lens (standards:leading-validity).** Prefer pushing invariants into the type layer so illegal matches are unrepresentable, over runtime guards. Where a gap cannot be closed at the type level (e.g. the no-match `Error` return), document the residual runtime risk explicitly rather than silencing it.
- **Coverage thresholds are strict (>90%).** Any runtime change (e.g. throwing instead of returning `Error` on no-match) adds branches that must be covered (`src/plgg/vite.config.ts`; memory: coverage must exceed 90%). Adding only type-level changes will not move runtime coverage, but new fixtures should not regress it.
- **Category placement.** `match` lives under `Flowables`; new type helpers belong in `Flowables/match.ts` or an appropriate existing category (`Grammaticals` for general boolean/union algebra). Do not introduce a new top-level category (`.workaholic/constraints/architecture.md` plgg Category Taxonomy).
- **Public API surface.** Helpers needed by the public type must be exported through `src/plgg/src/index.ts` (currently `match.ts` imports many helpers via `plgg/index`); ensure new exported types reach the root barrel (`.workaholic/constraints/architecture.md` Module Export Convention).
- **Overload duplication.** The 19 arity overloads (P1~P2 … P1~P20) each repeat the `OTHERWISE_LAST`/`PATTERNS` derivation. Any change to the coverage contract must be applied consistently across all overloads; consider whether a shared helper type can reduce the per-arity repetition without changing inference behavior (`src/plgg/src/Flowables/match.ts` lines 188-1259).
- **Scope discipline.** This ticket is identification + proposal. Avoid over-reaching into a full rewrite; if multiple independent fixes emerge, split implementation into dependent follow-up tickets keyed off this analysis.
