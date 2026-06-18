---
created_at: 2026-06-18T15:47:27+09:00
author: a@qmu.jp
type: housekeeping
layer: [Domain]
effort: 1h
commit_hash: 20c4570
category: Changed
depends_on:
---

# Document only public members — hide backing instance objects from the API reference

## Overview

The condensed API reference is still **redundant**: the `## Variables` section of
each package page is dominated by implementation-detail exports the user never
calls directly. These are the **backing instance objects** that implement plgg's
service/typeclass interfaces:

- **Service instances** (~80): `*Castable`, `*Refinable`, `*JsonSerializable` —
  one (or more) per type, e.g. `boxRefinable`, `numCastable`,
  `binJsonSerializable`, `alphabetRefinable`.
- **Typeclass instances** (~32): `*Functor`, `*Apply`, `*Applicative`, `*Chain`,
  `*Monad`, `*Pointed`, `*Foldable`, `*Traversable` — e.g. `optionFunctor`,
  `resultMonad`, `mutVecApplicative`.

The **public** API is the *derived* surface, not these objects: users call
`asNum`/`isNum`, `mapResult`/`chainResult`/`mapOption`, `ok`/`err`/`some`/`none`,
`foldlResult`, etc. — which are typically destructured out of the instances
(`export const { map: mapResult } = resultFunctor`). The instances themselves are
private machinery and should **not** be documented.

Goal: the reference documents only the public, user-facing members. Mark the
~112 instance objects `@internal` so `excludeInternal` (already on in
`typedoc.base.json`) drops them, while keeping the derived functions public.
Doc-only intent — keep the exports (no breaking change); just hide them from the
generated reference.

## Key Files

- `packages/plgg/src/Atomics/*.ts` — `*Castable`/`*Refinable`/`*JsonSerializable`
  for Num/Int/SoftStr/Bool/Time/BigInt/Bin.
- `packages/plgg/src/Basics/*.ts` — same instances for Str/Float/the case-strings
  and the ranged ints (I8…U128).
- `packages/plgg/src/Collectives/*.ts` (Vec/MutVec/ReadonlyArray),
  `Conjunctives/*.ts` (Obj/RawObj), `Contextuals/*.ts` (Box/Ok/Err/Some/None) —
  service + typeclass instances.
- `packages/plgg/src/Disjunctives/{Option,Result}.ts` — the `option*`/`result*`
  typeclass instances (Functor/Apply/Applicative/Chain/Monad/Foldable/Traversable).
- `packages/guide/typedoc.base.json` — `excludeInternal` is already `true`; this
  ticket relies on it. No config change expected unless a pattern-based exclusion
  is chosen instead (see Considerations).
- `packages/plgg/src/Flowables/match.ts` — precedent: its type-level helpers were
  already `@internal`-tagged in the prior reference-quality ticket.

## Implementation Steps

1. **Identify the instance objects** with the established naming patterns:
   `export const <name>(Castable|Refinable|JsonSerializable)[0-9]? [:=]` and
   `export const <name>(Functor|Apply|Applicative|Chain|Monad|Pointed|Foldable|Traversable)[0-9]? [:=]`
   (~112 across ~40 files; all already carry a JSDoc block like "Functor instance
   for Option.").
2. **Add `@internal`** to each instance object's JSDoc (extend the existing
   comment; do not touch the destructured `export const { map: mapResult } = …`
   lines, which stay public).
3. **Leave the derived public functions and the `asX`/`isX`/constructors alone**
   — they remain documented.
4. **Verify**: `npm run build` in `packages/guide` regenerates the reference;
   confirm the `## Variables` section no longer lists `*Castable`/`*Refinable`/
   `*JsonSerializable`/`*Functor`/`*Monad`/… while `mapResult`, `chainResult`,
   `getOr`, `ok`, `asNum`, etc. remain. Run `scripts/tsc-plgg.sh` and
   `scripts/test-plgg.sh` (the edits are comment-only, so both must still pass).

## Considerations

- **Doc-only, not a breaking change.** `@internal` only affects TypeDoc here —
  `tsconfig` does not set `stripInternal`, so the `.d.ts` and runtime exports are
  unchanged and consumers (other packages, tests) keep working. If a *true*
  encapsulation pass is wanted later (stop exporting these from `index.ts`), that
  is a separate, genuinely breaking ticket — out of scope here.
  (`packages/plgg/src/index.ts`)
- **Scriptable.** Because the targets follow strict naming patterns and each
  already has a JSDoc block, the edit can be applied semi-mechanically (insert an
  `@internal` line into each matching comment) rather than 112 hand edits — but
  verify each hunk; do not blanket-edit non-instance symbols with similar names.
- **Keep the derived combinators public.** `mapResult`/`mapOption`/`chainResult`/
  `chainOption`/`foldlResult`/`foldrResult`/`applyResult`/`ofResult` and friends
  are the public Foldable/Functor surface and must stay — only the instance
  *objects* they are derived from get `@internal`.
  (`packages/plgg/src/Disjunctives/Result.ts`)
- **Continues the reference-quality work.** Same approach as the `match.ts`
  type-level helpers already tagged in
  [20260618102232-condense-curate-api-reference.md](.workaholic/tickets/archive/work-20260617-214017/20260618102232-condense-curate-api-reference.md);
  this extends the "only public vocabulary" principle to the instance objects that
  ticket deliberately left in.
- **Implementation policy (`standards:implementation`).** Tagging the backing
  instances `@internal` sharpens the public/internal boundary without weakening
  the type-driven design — the derived, well-typed functions remain the API.

## Final Report

Development completed. Tagged **112 backing instance objects** `@internal` across
39 plgg-core files (Atomics, Basics, Collectives, Conjunctives, Contextuals,
Disjunctives, plus 2 in Grammaticals/Function.ts which the reference already
excludes by glob). The reference now documents only the public derived surface.

### Discovered Insights

- **Insight**: The edit was safely scriptable. A Node pass keyed on the strict
  naming patterns (`*Castable`/`*Refinable`/`*JsonSerializable` and
  `*Functor`/`*Apply`/`*Applicative`/`*Chain`/`*Monad`/`*Pointed`/`*Foldable`/
  `*Traversable`) inserted `@internal` into each instance's existing JSDoc; the
  destructured derived exports (`export const { map: mapResult } = resultFunctor`)
  start with `{`, so they never matched and stayed public. Verified by diff.
- **Insight**: The plgg-core page dropped from ~1117 headings to **328** — the
  instances accounted for ~70% of the reference bulk. Confirmed the public API
  survives (`cast()`/`proc()`/`pipe()`/`match()`/`ok()`/`asNum()`/`mapResult`/
  `chainResult`/`getOr()`/… all present) and the instance objects are gone.
- **Insight**: plgg-core's `src` is **not** fully Prettier-clean at baseline
  (~52 files flagged at HEAD, e.g. `Functionals/tap.spec.ts`, `Atomics/Int.ts`,
  `Disjunctives/Option.ts` — all flagged before this change). The `@internal`
  insertions themselves are Prettier-clean; this ticket did not touch the
  pre-existing formatting drift (out of scope), but it is worth a separate
  housekeeping ticket.
- **Insight**: Doc-only as intended — `scripts/tsc-plgg.sh` and the full
  `scripts/test-plgg.sh` (465 tests) both pass unchanged, since `@internal` is a
  JSDoc tag and `tsconfig` does not set `stripInternal` (exports/`.d.ts` intact).
