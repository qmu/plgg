---
created_at: 2026-07-01T20:42:04+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash: 85ca1be
category: Added
depends_on:
---

# Add `defineVariant` combinator to collapse the four-fold Box-variant scaffold

## Overview

Every tagged-union variant across the consumer packages is hand-written as **four declarations that all restate the same tag literal**: the type alias, the `box(tag)` constructor, the `pattern(tag)()` matcher thunk (`xxx$`), and the `isBoxWithTag(tag)` guard (`isXxx`). Add a single foundation combinator that emits the constructor + matcher + guard (and re-exposes the type) from one call, single-sourcing the tag literal.

Proposed shape (data-last, config-first, no escape hatch):

```ts
// packages/plgg/src/Contextuals/Variant.ts
export const defineVariant =
  <const TAG extends string>(tag: TAG) =>
  <CONTENT>(): {
    make: (c: CONTENT) => Box<TAG, CONTENT>;
    pattern: () => ReturnType<typeof pattern<TAG>>;
    is: (v: unknown) => v is Box<TAG, unknown>;
    tag: TAG;
  } => ({
    make: box(tag),
    pattern: () => pattern(tag)(),
    is: isBoxWithTag(tag),
    tag,
  });
```

Before (`plgg-cli/src/Cli/model/CliError.ts`, one variant = ~15 lines):

```ts
export type MissingOptionValue =
  Box<"MissingOptionValue", { option: SoftStr }>;
export const missingOptionValue = (option: SoftStr) =>
  box("MissingOptionValue")({ option });
export const missingOptionValue$ = () =>
  pattern("MissingOptionValue")();
export const isMissingOptionValue = (e: CliError) =>
  isBoxWithTag("MissingOptionValue")(e);
```

After:

```ts
const MissingOptionValue =
  defineVariant("MissingOptionValue")<{ option: SoftStr }>();
export type MissingOptionValue =
  ReturnType<typeof MissingOptionValue.make>;
// MissingOptionValue.make / .pattern / .is replace the trio,
// tag literal written once.
```

The **crux** (flagged in the research ticket): `defineVariant("Xxx")` must infer the literal `"Xxx"`, not widen to `string`. This requires the `const TAG extends string` const-type-parameter — available on the repo's `typescript@^6.0.3`. The whole value depends on this typing cleanly with **no `as`/`any`/`@ts-ignore`**; if a clean signature for `pattern`/`make`/`is` is not reachable, ship the reduced helper that is (e.g. `make` + `is` only) and record the gap — never reach for an escape hatch.

**Trip Origin:** none — spun off from the foundation-semantics audit ([20260701201654-audit-foundation-semantics-repetition.md](.workaholic/tickets/archive/work-20260701-185044/20260701201654-audit-foundation-semantics-repetition.md)).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — new combinator lands in the **Contextuals** category (beside `Box`/`Pattern`) and is re-exported through `packages/plgg/src/Contextuals/index.ts` → `packages/plgg/src/index.ts`; no new top-level category.
- `workaholic:implementation` / `policies/coding-standards.md` — the `const TAG` inference must hold with **no `as`/`any`/`@ts-ignore`**; grandfathered core seams are not precedent.
- `workaholic:implementation` / `policies/type-driven-design.md` — the combinator must preserve each variant's exact `Box<TAG, CONTENT>` type so `match` stays exhaustive at fold sites.
- `workaholic:implementation` / `policies/functional-programming.md` — config-first, data-last; the returned `{ make, pattern, is }` are standalone functions, no methods-on-data.
- `plgg-coding-style` (skill) — extend the `asX`/`isX`/`X$` vocabulary without collision; JSDoc explains the why; Prettier printWidth 50; colocated spec.

Repo constraints: `.workaholic/constraints/architecture.md` (eleven-category taxonomy, root-index export), `.workaholic/constraints/quality.md` (strict flags, ≥90% coverage, escape-hatch prohibition).

## Key Files

- `packages/plgg/src/Contextuals/Box.ts` — `box`, `isBoxWithTag`, `hasTag`, `forContent` the combinator composes over (lines 83-127).
- `packages/plgg/src/Contextuals/Pattern.ts` — `pattern(tag)()` the matcher wraps (lines 24-35).
- `packages/plgg/src/Contextuals/index.ts` — add the new `Variant` export here.
- `packages/plgg/src/index.ts` — root barrel that must re-export it.

Repetition sites to migrate (each cited by the audit):

- `packages/plgg-cli/src/Cli/model/CliError.ts` — 2 variants, the full four-fold incl. `isXxx` guards (lines 16-83); minimal complete migration oracle.
- `packages/plgg-http/src/Http/model/HttpError.ts` — 8 variants × (constructor + `$` matcher), lines 42-118; largest concentration.
- `packages/plgg-fetch/src/Http/model/ClientError.ts` — the trio repeated when extending another package's union.
- `packages/plgg-kit/src/LLMs/model/Provider.ts` — per-variant `type`+`$`+`asXxx`+constructor ×3 (note: uses `pattern("OpenAI")` un-thunked — reconcile the matcher shape).
- `packages/plgg-router/src/Routing/model/Segment.ts`, `packages/plgg-view/src/Html/model/Html.ts` — non-error tagged unions with the same repetition.
- `packages/plgg-sql/src/Db/model/Db.ts` — `SqlError` constructor+`$` trio (lines 56-80).

## Related History

- [20260525205926-match-type-completeness-gap-analysis.md](.workaholic/tickets/archive/work-20260513-182057/20260525205926-match-type-completeness-gap-analysis.md) — the `match` gap-analysis this combinator must keep exhaustive.
- [20260617081220-errors-as-data-migration.md](.workaholic/tickets/archive/work-20260617-002003/20260617081220-errors-as-data-migration.md) — migrated errors to `Box` unions; the variants this ticket now de-boilerplates.
- [20260527175426-unify-match-nonexhaustive-runtime-with-coverageerror.md](.workaholic/tickets/archive/plgg-http-client/20260527175426-unify-match-nonexhaustive-runtime-with-coverageerror.md) — `match`/`CoverageError` semantics the `.pattern` output must stay compatible with.

## Implementation Steps

1. Add `packages/plgg/src/Contextuals/Variant.ts` with `defineVariant` per the sketch. Prove the `const TAG` literal inference and the `Box<TAG, CONTENT>` return type with no escape hatch. If `.pattern`'s type cannot be expressed cleanly, expose `make`/`is`/`tag` only and record why in the ticket.
2. Colocate `Variant.spec.ts`: cover `make` produces the tagged box, `is` narrows correctly (positive + negative), `pattern` folds through `match` exhaustively, and the tag literal is preserved as a literal type (a `@ts-expect-error`-free type-level assertion, not a runtime-only test).
3. Wire exports: `Contextuals/index.ts` and `src/index.ts`.
4. Migrate the minimal oracle first — `plgg-cli/src/Cli/model/CliError.ts` — replacing both variants' four-fold with `defineVariant`, keeping the public names (`missingOptionValue`, `missingOptionValue$`, `isMissingOptionValue`, the `MissingOptionValue` type) exported so `formatCliError` and callers are unchanged. Confirm `formatCliError`'s `match` still type-checks exhaustively.
5. Migrate the remaining sites (HttpError, ClientError, Provider, Segment, Html, SqlError), reconciling the un-thunked `pattern("OpenAI")` shape in Provider.
6. Run `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh`; keep coverage ≥90%. Rebuild dependents after core edits.

## Quality Gate

**Acceptance criteria:**
- `defineVariant("Xxx")<C>()` returns `{ make, pattern, is, tag }` with `make: (c: C) => Box<"Xxx", C>`, `is` narrowing to `Box<"Xxx", unknown>`, and `tag` typed as the literal `"Xxx"` (not `string`) — asserted at the type level in the spec.
- No `as`/`any`/`@ts-ignore`/`@ts-expect-error` (except a deliberate type-level negative assertion) anywhere in `Variant.ts` or the migrations.
- Every migrated site preserves its public export names and its `match` fold stays exhaustive (removing a handled arm is a compile error).
- Net line reduction at each migrated model file; the tag literal appears once per variant.

**Verification method:**
- `scripts/tsc-plgg.sh` exits 0; `scripts/test-plgg.sh` green with coverage ≥90% (statements/branches/functions/lines).
- `Variant.spec.ts` covers make/is(+/-)/pattern-through-match and the literal-type assertion.
- `grep -n 'as \|: any\|ts-ignore' packages/plgg/src/Contextuals/Variant.ts` returns nothing.

**Gate:** tsc + test green, ≥90% coverage, no escape hatch, CliError oracle migrated with identical public surface, and Prettier printWidth-50 conforming.

## Considerations

- The `const` type parameter is load-bearing; if a `typescript` downgrade ever drops it, variant tags silently widen to `string` and `match` exhaustiveness weakens (`packages/plgg/src/Contextuals/Variant.ts`).
- `refinedBrand` (sibling ticket 20260701204205) may build on `defineVariant`; keep `make`/`is` composable so it can, but do not couple the two — `refinedBrand` can also call `box`/`isBoxWithTag` directly.
- Provider's un-thunked `pattern("OpenAI")` vs the `xxx$ = () => pattern(...)()` thunk elsewhere is an existing inconsistency this migration should normalize (`packages/plgg-kit/src/LLMs/model/Provider.ts`).
- Breaking changes are acceptable (plgg is its own only consumer), but keep each migrated file's public export names stable to keep the diff reviewable.

## Final Report

Development completed. Added `packages/plgg/src/Contextuals/Variant.ts` — `defineVariant("Xxx")<Payload>()` returning `{ tag, make, pattern, is }`, with `const TAG` holding the tag literal and `is` narrowing to `Box<TAG, unknown>` (the honest, escape-hatch-free signature; full-content narrowing is recovered per-site via a typed guard wrapper). Colocated `Variant.spec.ts` covers make/tag/is(+/-)/pattern-through-match.

Migrated **6 of the 7** listed sites, each single-sourcing its tag literal and preserving every public export name + signature:
- `plgg-cli` CliError, `plgg-fetch` ClientError, `plgg-http` HttpError (8 variants), `plgg-router` Segment, `plgg-kit` Provider, `plgg-sql` Db `SqlError`.

**Excluded (documented): `plgg-view` Html.** `Html<Msg, T>` is a *generic* variant; `defineVariant`'s non-generic `CONTENT` cannot derive the generic `Html<Msg, T>` type via `ReturnType<typeof make>`, so forcing it would drop the generics. Per the ticket's "ship the reduced helper or record the gap — never an escape hatch" rule, Html keeps its inline union. `defineVariant` is for non-generic variants.

Public-surface preservation techniques (no escape hatch):
- Typed guard wrapper `(e: Union): e is Variant => V.is(e)` — an annotation, not a cast — keeps the original within-union content narrowing (verified: `plgg-fetch/.../request.spec.ts` accesses `.content` after `isNetworkError`).
- Constructor wrappers `(arg) => V.make({ … })` preserve the original argument shape.
- `openAI$`/`anthropic$`/`google$` were un-thunked `pattern(tag)`; call sites always invoke them as `openAI$()`, so `= V.pattern` (a `() => PatternIcon` thunk) is call-compatible — normalizing the prior inconsistency.

Verification: `test-plgg.sh` 483 (+ Variant specs); plgg-cli 42, plgg-fetch 27, plgg-http 32, plgg-router 39, plgg-kit 12, plgg-sql 27, plgg-server 96, plgg-foundry 6, plgg-view 127, plgg-md 68 — all green after rebuilding plgg + plgg-http dist. No `as`/`any`/`@ts-ignore` in any touched file.

### Discovered Insights

- **Insight**: `defineVariant` fits **non-generic** tagged variants only. A variant whose payload is parameterized by the enclosing type's generics (like `Html<Msg, T>`) cannot derive its type from `ReturnType<typeof make>` because `make` is monomorphic — such variants stay hand-written.
  **Context**: This is the natural boundary of the combinator; the audit's "collapse the four-fold scaffold" applies to concrete variants (errors, routing segments, providers), not generic view nodes.
- **Insight**: The weaker `is: v is Box<TAG, unknown>` signature is not a regression — within a closed union a tag check *is* a sound discriminator, so each site re-declares the full-content narrowing with a one-line typed guard wrapper (`(e: Union): e is Variant => V.is(e)`). The annotation is a type predicate, not a cast, so it stays inside the no-escape-hatch rule.
  **Context**: This is why the combinator can ship the honest `unknown`-check signature while call sites keep their precise narrowing.
