---
created_at: 2026-07-01T20:42:06+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 0.5h
commit_hash: a931c0b
category: Added
depends_on:
---

# Add an `Ord`/`compare` foundation primitive for total orders

## Overview

The foundation exposes no ordering primitive, so every total-order need reinvents a hand-rolled `-1/0/1` (or `-1/1`) ternary. There are at least two live sites, and they disagree on completeness (one is a correct three-way comparator, the other a two-way that never returns `0`). Add a small `Ord`/`Comparable` typeclass plus data-last helpers (`compare`, `comparing`/`compareBy`, `sortBy`) so ordering is expressed once, correctly, and composably.

Sites:

```ts
// packages/plgg-db-migration/.../Version.ts:66  (three-way, correct)
export const compareVersion = (a, b) =>
  a.content < b.content ? -1 : a.content > b.content ? 1 : 0;

// packages/plgg-router/.../serializeQuery.ts:20  (two-way, no 0 case — unstable-ish)
.sort(([a], [b]) => (a < b ? -1 : 1))
```

Proposed shape:

```ts
// packages/plgg/src/Abstracts/Servables/Comparable.ts
export type Ordering = -1 | 0 | 1;
export type Comparable<T> = {
  compare: (a: T, b: T) => Ordering;
};

// packages/plgg/src/Functionals/compare.ts
// primitive total order for the language-comparable scalars
export const compare = <T extends string | number | bigint>(
  a: T, b: T,
): Ordering => (a < b ? -1 : a > b ? 1 : 0);

// derive an Ordering by projecting to a comparable key
export const comparing =
  <T, K extends string | number | bigint>(key: (t: T) => K) =>
  (a: T, b: T): Ordering => compare(key(a), key(b));

// data-last, non-mutating sort
export const sortBy =
  <T>(cmp: (a: T, b: T) => Ordering) =>
  (xs: ReadonlyArray<T>): ReadonlyArray<T> =>
    [...xs].sort(cmp);
```

Then `compareVersion = comparing(versionString)` and the router sort becomes `sortBy(comparing(([k]) => k))` — the `0`-case bug fixed for free. All expressible with no escape hatch.

**Trip Origin:** none — spun off from the foundation-semantics audit ([20260701201654-audit-foundation-semantics-repetition.md](.workaholic/tickets/archive/work-20260701-185044/20260701201654-audit-foundation-semantics-repetition.md)).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — the `Comparable` typeclass joins **Abstracts/Servables** (beside `Castable`/`Refinable`); the `compare`/`comparing`/`sortBy` helpers join **Functionals**; both re-exported through their `index.ts` → `src/index.ts`. No new top-level category (a `Comparable` typeclass fits the existing Servables group; only a *new* category needs an explicit architecture decision).
- `workaholic:implementation` / `policies/coding-standards.md` — the `<T extends string | number | bigint>` bound keeps `<` well-defined without `as`; no escape hatch.
- `workaholic:implementation` / `policies/type-driven-design.md` — `Ordering = -1 | 0 | 1` is a precise return type, not `number`; callers can `match` on it.
- `workaholic:implementation` / `policies/functional-programming.md` — `sortBy` is non-mutating (copies before `.sort`); config-first, data-last.
- `plgg-coding-style` (skill) — naming, Prettier printWidth 50, colocated specs.

Repo constraints: `.workaholic/constraints/architecture.md`, `.workaholic/constraints/quality.md`.

## Key Files

- `packages/plgg/src/Abstracts/Servables/index.ts` — add `Comparable` beside `Castable`/`Refinable`.
- `packages/plgg/src/Functionals/index.ts` — add `compare`/`comparing`/`sortBy`.
- `packages/plgg/src/index.ts` — root barrel wiring.

Repetition sites to migrate:

- `packages/plgg-db-migration/src/domain/model/Version.ts` — `compareVersion` (lines 66-74) → `comparing(versionString)`.
- `packages/plgg-router/src/Routing/usecase/serializeQuery.ts` — the `.sort(([a],[b]) => a < b ? -1 : 1)` (line 20) → `sortBy(comparing(...))`, gaining the `0` case.

## Related History

- [20260527023826-result-maperr-and-json-codec.md](.workaholic/tickets/archive/work-20260513-182057/20260527023826-result-maperr-and-json-codec.md) — precedent for adding a small missing core primitive.
- The Abstracts/Principals layer (Functor/Monad/Monoid) shows the house typeclass style `Comparable` should mirror.

## Implementation Steps

1. Add `Ordering` + `Comparable<T>` in `Abstracts/Servables/Comparable.ts`; wire its `index.ts`.
2. Add `compare`, `comparing`, `sortBy` in `Functionals/`; wire `index.ts` and `src/index.ts`.
3. Colocate specs: `compare` for `<`/`>`/`=` on string, number, and bigint; `comparing` via a projection; `sortBy` non-mutation (input array unchanged) + correctness incl. equal elements (stable/`0` case).
4. Migrate `compareVersion` to `comparing(versionString)`, preserving its export name and ascending/chronological semantics; keep `Version.spec.ts` green.
5. Migrate the router sort to `sortBy(comparing(...))`; add/adjust a spec asserting equal keys are handled (the previously-missing `0` case).
6. `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh`; coverage ≥90%.

## Quality Gate

**Acceptance criteria:**
- `compare`/`comparing`/`sortBy` exported from plgg core with `Ordering = -1 | 0 | 1` return typing; `sortBy` does not mutate its input.
- `compareVersion` reduced to a `comparing(...)` one-liner with identical ordering behavior; the router sort uses the primitive and now handles equal keys (`0`).
- No `as`/`any`/`@ts-ignore`/`@ts-expect-error`.
- No new top-level category introduced (Comparable in Servables, helpers in Functionals).

**Verification method:**
- `scripts/tsc-plgg.sh` exits 0; `scripts/test-plgg.sh` green, coverage ≥90%.
- New specs cover the three orderings across string/number/bigint, projection, and `sortBy` non-mutation + equal-element handling.
- `Version.spec.ts` and any router serializeQuery spec stay green.

**Gate:** tsc + test green, ≥90% coverage, no escape hatch, both comparators migrated (router `0`-case fixed), printWidth-50 conforming.

## Considerations

- **Composability with branded scalars.** Once the deferred `Int`/`Uint`/`Float`/`Str` tickets (20260701013300-04) land, `compare` should work over them directly (they are `<`-comparable at the content level via `comparing(unwrap)`); keep the `<T extends string | number | bigint>` bound and the `comparing` projection so branded values compose without a bespoke comparator (`packages/plgg-db-migration/src/domain/model/Version.ts`).
- **`Ordering` as data.** Returning `-1 | 0 | 1` (not `number`) lets callers `match` on the result later; do not widen to `number` for `Array.sort` convenience — `.sort` accepts the narrower type fine.
- **Two-way vs three-way.** The router site's missing `0` case is a latent instability; migrating it is a behavior fix, acceptable since plgg is its own consumer — note it in the commit `Changes`.
- Whether to also provide `reverse`/`thenComparing` combinators is deferred; add only if a second-key sort site appears (single-site rule).

## Final Report

Development completed as planned. Added `Ordering`/`Comparable<T>` in `Abstracts/Servables/Comparable.ts` and `compare`/`comparing`/`sortBy` in `Functionals/compare.ts`, wired both barrels. Migrated `compareVersion` to `comparing<Version, string>((v) => v.content)` (return type tightened to `Ordering`) and the router `serializeQuery` sort to `compare(a, b)` — the latter now returns `0` for equal keys, fixing the prior two-way comparator's missing-`0` instability. Used the inline `compare(a, b)` at the router site rather than restructuring the chain into `sortBy` — smaller diff, same `0`-case fix.

Verification: rebuilt plgg dist; `scripts/test-plgg.sh` 474 passed (+6 from `compare.spec.ts` covering the three orderings on string/number/bigint, projection, and `sortBy` non-mutation + equal elements); `scripts/test-plgg-router.sh` 39 passed; `scripts/test-plgg-db-migration.sh` 75 passed. No `as`/`any`/`@ts-ignore` in the touched files.

### Discovered Insights

- **Insight**: `Comparable.ts` is type-only (a `type` + an `interface`), so it contributes no executable lines and needs no colocated spec to satisfy the coverage gate — mirroring the other `Servables` interface files.
  **Context**: New foundation typeclasses can ship without a spec; only the runtime helpers (`compare`/`comparing`/`sortBy`) need coverage.
