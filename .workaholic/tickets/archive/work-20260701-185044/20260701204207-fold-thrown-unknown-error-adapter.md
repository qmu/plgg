---
created_at: 2026-07-01T20:42:07+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 0.5h
commit_hash: 965009e
category: Added
depends_on:
---

# Add `foldThrown` to collapse the ad-hoc `unknown → Error`-fork adapters

## Overview

Multiple `unknown → domain-error` adapters independently re-narrow a caught value with the same `value instanceof Error ? … : …` fork. The repeated shape is *"decide by whether the thrown value is a real `Error`, and build a result from each branch"* — there is no foundation combinator for it, so each adapter re-implements the narrowing (and the `String(value)` fallback) by hand. Add one small primitive that expresses the fork once, with the `Error` branch correctly narrowed (no cast).

Live sites (the shared fork bolded):

```ts
// plgg/src/Exceptionals/Cause.ts:25
toCause = (value) => value instanceof Error
  ? { name: value.name, message: value.message, stack: fromNullable(value.stack) }
  : { name: "NonError", message: String(value), stack: none() };

// plgg-sql/src/Db/model/Db.ts:81
toSqlError = (cause) => cause instanceof Error
  ? sqlError(cause.message, cause)
  : sqlError("SQL execution failed");

// plgg/src/Exceptionals/PlggError.ts:176
toError = (e) => e instanceof Error ? e : isBox(e) ? boxToError(e) : new Error(String(e));
```

Proposed primitive (config-first, data-last, no escape hatch):

```ts
// packages/plgg/src/Exceptionals/foldThrown.ts
export const foldThrown =
  <R>(
    onError: (e: Error) => R,
    onOther: (v: unknown) => R,
  ) =>
  (value: unknown): R =>
    value instanceof Error ? onError(value) : onOther(value);
```

After: `toCause = foldThrown(e => ({...}), v => ({ name: "NonError", message: String(v), stack: none() }))`; `toSqlError = foldThrown(e => sqlError(e.message, e), () => sqlError("SQL execution failed"))`. `toError`'s inner `isBox` sub-branch stays inside its `onOther`, but the `Error`-vs-not fork is unified. The `onError` callback receives a properly-narrowed `Error` — the win over hand-rolled `instanceof` is that the narrowing is written and tested once.

**Trip Origin:** none — spun off from the foundation-semantics audit ([20260701201654-audit-foundation-semantics-repetition.md](.workaholic/tickets/archive/work-20260701-185044/20260701201654-audit-foundation-semantics-repetition.md)).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — lands in **Exceptionals** (beside `Cause`/`PlggError`), re-exported through the Exceptionals `index.ts` → `src/index.ts`; no new category.
- `workaholic:implementation` / `policies/coding-standards.md` — `value instanceof Error` narrows without a cast; the combinator must stay escape-hatch-free.
- `workaholic:implementation` / `policies/functional-programming.md` — config-first `(onError, onOther) => (value) => R`; a pure fold, no side effects.
- `workaholic:implementation` / `policies/type-driven-design.md` — the `onError` branch is typed `(e: Error) => R`, making the narrowing part of the signature rather than re-derived at each site.
- `plgg-coding-style` (skill) — naming, Prettier printWidth 50, colocated spec; Result-not-throw and Option-not-null preserved in the adapters.

Repo constraints: `.workaholic/constraints/architecture.md`, `.workaholic/constraints/quality.md`.

## Key Files

- `packages/plgg/src/Exceptionals/Cause.ts` — `toCause` (lines 25-36); the canonical `Error → serializable data` snapshot the other adapters conceptually reduce to.
- `packages/plgg/src/Exceptionals/PlggError.ts` — `toError` (lines 176-181); has an extra `isBox` sub-branch inside `onOther`.
- `packages/plgg-sql/src/Db/model/Db.ts` — `toSqlError` (lines 81-84).
- `packages/plgg/src/Exceptionals/index.ts`, `packages/plgg/src/index.ts` — export wiring.

## Related History

- [20260617081220-errors-as-data-migration.md](.workaholic/tickets/archive/work-20260617-002003/20260617081220-errors-as-data-migration.md) — errors-as-data migration that produced `Cause`/tagged errors; this ticket de-duplicates the adapters that feed them.
- [20260617081221-proc-error-union-and-collapse.md](.workaholic/tickets/archive/work-20260617-002003/20260617081221-proc-error-union-and-collapse.md) — `proc` error handling that consumes these adapters at the async edge.

## Implementation Steps

1. Add `packages/plgg/src/Exceptionals/foldThrown.ts` with the primitive; prove `onError`'s `Error` narrowing with no cast. Wire the Exceptionals `index.ts` and `src/index.ts`.
2. Colocate `foldThrown.spec.ts`: an `Error` input routes to `onError` with the narrowed value; a non-`Error` (string, object, null, undefined) routes to `onOther`; the return type is whatever the callbacks produce.
3. Migrate `toCause` to `foldThrown`, preserving its exact output (incl. the `NonError`/`String(value)` fallback and `fromNullable(stack)`); keep `Cause.spec.ts` green.
4. Migrate `toSqlError` to `foldThrown`, preserving the `"SQL execution failed"` fallback and cause chaining.
5. Migrate `toError`'s `Error`-vs-not fork to `foldThrown`, keeping the inner `isBox → boxToError` branch in `onOther`; keep `PlggError.spec.ts` green.
6. `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh`; coverage ≥90%; rebuild `plgg-sql` after core edits.

## Quality Gate

**Acceptance criteria:**
- `foldThrown(onError, onOther)(value)` routes `Error` instances to `onError` (narrowed to `Error`) and everything else to `onOther`, returning the callbacks' `R`.
- `toCause`, `toSqlError`, `toError` migrated to `foldThrown` with byte-identical behavior (same fallbacks, same cause chaining, same `Option` handling); their existing spec suites pass unchanged.
- No `as`/`any`/`@ts-ignore`/`@ts-expect-error`.

**Verification method:**
- `scripts/tsc-plgg.sh` exits 0; `scripts/test-plgg.sh` green, coverage ≥90%.
- `foldThrown.spec.ts` covers Error / string / object / null / undefined inputs.
- `Cause.spec.ts`, `PlggError.spec.ts`, and the plgg-sql Db spec stay green as migration oracles.

**Gate:** tsc + test green, ≥90% coverage, no escape hatch, all three adapters migrated with identical behavior, printWidth-50 conforming.

## Considerations

- **Scope of the fork only.** `toError` also branches on `isBox`; keep that inside `onOther` rather than growing `foldThrown` into a three-way — the shared, repeated shape is strictly the `Error`-vs-not fork. Adding a `Box` arm would over-fit one caller (`packages/plgg/src/Exceptionals/PlggError.ts`).
- **`toCause` as the reduction target.** Consider whether `toSqlError` should route its non-`Error` branch through `toCause` for a consistent snapshot instead of a bare string; a behavior change, acceptable but call it out in the commit `Changes` (`packages/plgg-sql/src/Db/model/Db.ts`).
- **Cross-package rebuild.** `toSqlError` lives in `plgg-sql`; after editing plgg core, rebuild dependents (strictly-upward dependency direction) before running its tests.

## Final Report

Development completed as planned. Added `packages/plgg/src/Exceptionals/foldThrown.ts` (config-first `(onError, onOther) => (value) => R`, `Error`-narrowing with no escape hatch), wired it through the Exceptionals barrel, and migrated all three `unknown → domain-error` adapters (`toCause`, `toError`, `toSqlError`) to it with byte-identical behavior. `toError`'s inner `isBox → boxToError` branch stayed inside `onOther` as scoped. Colocated `foldThrown.spec.ts` covers Error/string/number/null/undefined/object inputs plus subtype narrowing.

Verification: `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` 468 passed; rebuilt plgg dist and `scripts/test-plgg-sql.sh` 27 passed (confirming the new export resolves downstream). No `as`/`any`/`@ts-ignore` in the touched files.

### Discovered Insights

- **Insight**: A source edit that consumes a **new** plgg export from another package (here plgg-sql using `foldThrown`) requires rebuilding plgg's `dist/` first — downstream packages resolve `plgg` via a `node_modules` symlink to `dist/index.*.js`+`dist/index.d.ts`, not to source.
  **Context**: `packages/plgg/dist` is gitignored, so the rebuild isn't committed, but skipping it makes the consumer's `tsc` fail with "no exported member" even though plgg's own tsc is green. Any cross-package foundation-addition ticket must `npm run build` in `packages/plgg` before running the consumer's suite.
