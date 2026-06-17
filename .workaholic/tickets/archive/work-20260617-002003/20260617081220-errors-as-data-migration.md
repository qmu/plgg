---
created_at: 2026-06-17T08:12:20+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort: 4h
commit_hash: 7b93ab7
category: Changed
depends_on: [20260617081219-error-core-defect-and-relaxed-bounds.md]
---

# Errors as data: migrate the class hierarchy to `Box` unions (BREAKING)

## Overview

Part 2 of 3. The big breaking commit: convert plgg's error *classes* to pure
tagged `Box` data, delete the `Error`-class hierarchy, and migrate every call
site. After T1 made the effect family generic, the `Error` subclassing is dead
weight and the only place plgg breaks its own no-class rule. Removing it makes
the no-class rule **universal**. Must land in **one `tsc`-green commit** — the
shape change (`.message` → `.content.message`, `new X({...})` → `x(...)`) can't
be half-applied.

## Key Files

- `packages/plgg/src/Exceptionals/InvalidError.ts`, `SerializeError.ts`,
  `DeserializeError.ts` - class → `Box` union + positional constructor +
  `X$` matcher.
- `packages/plgg/src/Exceptionals/BaseError.ts`, `Exception.ts` - **delete**;
  `Defect` (from T1) replaces `Exception`.
- `packages/plgg/src/Exceptionals/PlggError.ts` - `PlggError` becomes
  `InvalidError | SerializeError | DeserializeError | Defect`; reimplement
  `isPlggError` (curated core-tag set via `isBox` + `__tag`) and `printPlggError`
  → `printError` over data (fold `Defect`'s `cause`; else render `__tag` +
  `content.message`).
- `packages/plgg/src/Exceptionals/index.ts` - drop `BaseError`/`Exception`
  exports.
- `packages/plgg/src/Flowables/cast.ts` - rewrite the `InvalidError` sibling
  aggregation (lines ~530–565) to the data form; drop `parent`. Keep `sibling`
  nesting for `forProp` failures.
- `packages/plgg/src/Contextuals/Ok.ts`, `Err.ts` - `new InvalidError({message})`
  → `invalidError(message)` in `asOk`/`asErr`.
- `packages/plgg/src/Functionals/tryCatch.ts` - default `errorHandler` now
  returns `defect(...)` instead of `new Error(...)`.
- `packages/plgg/src/Functionals/env.ts` - 3× `new Exception(...)` → `defect(...)`.
- `packages/plgg-sql/src/Db/model/Db.ts` - `SqlError extends BaseError` → `Box`
  union.
- `packages/plgg-foundry/src/Foundry/usecase/operate.ts` - errors flowing
  through `conclude`; adjust to data form.
- **All ~85 `new InvalidError({ message })` + 6 `new Exception(...)` sites**
  across `plgg*/src` and `example/src` (drive off `tsc` errors).

## Related History

Depends on
[20260617081219-error-core-defect-and-relaxed-bounds.md](.workaholic/tickets/todo/a-qmu-jp/20260617081219-error-core-defect-and-relaxed-bounds.md)
(provides `Defect`, the relaxed bounds).

## Implementation Steps

1. Rewrite `InvalidError`/`SerializeError`/`DeserializeError` as `Box` unions
   with positional constructors `invalidError(message, sibling?)` /
   `serializeError(message)` / `deserializeError(message)` and `X$` matchers
   (see Patches).
2. Delete `BaseError.ts`, `Exception.ts`; update `Exceptionals/index.ts`.
3. Reimplement `isPlggError` (structural over the curated core tags) and
   `printError` over the data model.
4. Rewrite `cast.ts` sibling aggregation to build `invalidError(msg, siblings)`;
   drop every `parent:` field.
5. Switch `tryCatch`'s default handler and `env.ts` to `defect(...)`.
6. Run `scripts/tsc-plgg.sh`; fix every reported `new InvalidError(...)` /
   `.message`-on-error / `new Exception(...)` site (the ~85+6). Prefer a
   constructor that minimizes churn (positional `message` first).
7. Migrate `plgg-sql` `SqlError` and `plgg-foundry` errors to `Box` data.
8. `scripts/tsc-plgg.sh` clean across all packages, `scripts/test-plgg.sh`
   green (update the ~30 error-constructing test sites too); rebuild `plgg`.

## Patches

### `packages/plgg/src/Exceptionals/InvalidError.ts` (class → data)

```ts
import { Box, SoftStr, box, pattern } from "plgg/index";

export type InvalidError = Box<
  "InvalidError",
  {
    message: SoftStr;
    sibling: ReadonlyArray<InvalidError>;
  }
>;

export const invalidError = (
  message: SoftStr,
  sibling: ReadonlyArray<InvalidError> = [],
): InvalidError =>
  box("InvalidError")({ message, sibling });

export const invalidError$ = () =>
  pattern("InvalidError")();
```

*(`SerializeError`/`DeserializeError`: same one-line union, `content` =
`{ message }`, constructor `serializeError(message)` / `deserializeError(message)`.)*

## Considerations

- **One green commit — no half-migration.** Reading `err.message` (class) vs
  `err.content.message` (data) differ; every site flips together. Land behind a
  single `tsc`-green checkpoint. (`packages/plgg/src/Exceptionals/*`)
- **`cast.ts` is the subtle one.** Its `forProp` aggregation nests child
  `InvalidError`s as `sibling` and currently sets `parent`. Rebuild with
  `invalidError(message, [...children])`; `parent` is gone (chaining lives only
  on `Defect.cause` now). Verify `asObj`/`forProp`/`forOptionProp` error
  messages are unchanged. (`packages/plgg/src/Flowables/cast.ts` ~530–565)
- **`isPlggError` loses the `__ = "PlggError"` brand.** Use a curated tag set
  (`InvalidError`/`SerializeError`/`DeserializeError`/`Defect`); `printError`
  must still render an unrecognized `Box` (`__tag` + JSON `content`).
  (`packages/plgg/src/Exceptionals/PlggError.ts`)
- **No new `as`/`any`.** Reading `.content.message` off a known union member is
  safe after a `match`/guard; never cast `unknown` content.
- **Tests carry ~30 construction sites** — migrate them in the same commit so
  `test-plgg.sh` stays green.

## Final Report

Development completed as planned. Full repo green via `scripts/check-all.sh`
(all 8 packages build; plgg 458, view 115, server 76, router 39, http 32,
fetch 27, sql 25, kit 12, foundry 6, example 25 tests pass). Zero
`as`/`any`/`ts-ignore` introduced.

### Discovered Insights

- **Insight**: constructors were made **object-arg** (`invalidError({ message })`),
  not positional as the patch sketched.
  **Context**: the old class constructors were object-arg, so dropping `new`
  turned the ~85-site migration into a near-mechanical `new InvalidError(` →
  `invalidError(` rename instead of risky positional extraction from multi-line,
  printWidth-50-wrapped call sites.
- **Insight**: deleting `Exception` **forced** `proc`'s error channel (and
  `Procedural`'s default) to broaden from `Error` to `unknown` in *this* ticket,
  not T3.
  **Context**: once `InvalidError` is data (not an `Error`), a `proc` step
  returning `Result<_, InvalidError>` no longer satisfies a `Result<_, Error>`
  channel. T2 and T3 are entangled here; T2 broadens to `unknown`, T3 makes it
  the precise inferred union.
- **Insight**: a `Result` whose error is a data error reads its message at
  `result.content.content.message` — **double `.content`**.
  **Context**: `Err<InvalidError>.content` is the InvalidError box, whose payload
  is at `.content`. This is the single most common migration edit (one extra
  `.content` on every error-message assertion); the compiler flags each site
  exactly.
- **Insight**: `match` requires **≥2 arms**; library `printPlggError` walks
  `InvalidError.sibling` and `Defect.cause` (an `Error`) instead of the deleted
  class `parent` chain.
