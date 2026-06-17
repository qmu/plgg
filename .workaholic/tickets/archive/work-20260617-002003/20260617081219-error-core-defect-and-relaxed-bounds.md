---
created_at: 2026-06-17T08:12:19+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 0.5h
commit_hash: aab2877
category: Added
depends_on:
---

# Error core: `Defect` + `toError`/`panic` + drop the `E extends Error` bound (additive)

## Overview

Part 1 of 3 of the error-model redesign (split from the original
`proc-friendly-tagged-error-idiom` ticket). **Shared design decision** (applies
to all three parts): errors become pure tagged data (`Box` unions), not `Error`
subclasses; a single `Defect` is the bottom for *unexpected throws*; the
`Result` effect family becomes generic over `E`. **Locked decision A:** stack
lives only on `Defect` (typed errors are stackless, no per-error `new Error()`
capture).

This part is deliberately **additive and backward-compatible** so it lands
`tsc`-green with **zero call-site churn**: it adds `Defect`, the interop helpers
`toError`/`panic`, and *removes* the `E extends Error` upper bound from
`Procedural`, `proc`, `tryCatch`, and `conclude` (defaulting `E` to `Defect`).
Existing class errors (`InvalidError`, `Exception`, …) are still `Error`s, hence
still satisfy an *unconstrained* `E`, so nothing breaks. This unblocks the data
migration (T2) and the `proc` union inference (T3) without a flag day.

## Key Files

- `packages/plgg/src/Exceptionals/Defect.ts` (new) - the bottom error.
- `packages/plgg/src/Exceptionals/PlggError.ts` - add `toError(e): Error` and
  `panic(e): never`; leave the existing `isPlggError`/`printPlggError` intact
  for now (T2 reworks them onto data).
- `packages/plgg/src/Exceptionals/index.ts` - export `Defect`.
- `packages/plgg/src/Grammaticals/Procedural.ts` - `U extends Error = Error` →
  `E = Defect`.
- `packages/plgg/src/Functionals/tryCatch.ts` - drop `E extends Error`; default
  `errorHandler` may still build an `Error` for now (T2 switches it to
  `defect`), as long as the bound is gone.
- `packages/plgg/src/Functionals/conclude.ts` - drop `F extends Error`.
- `packages/plgg/src/Flowables/proc.ts` - no signature rework here (T3); only
  ensure it still compiles with the relaxed `Procedural`.

## Related History

Splits the design captured in the retired
`20260617081219-proc-friendly-tagged-error-idiom.md`. First beneficiary is the
SSG ticket
([20260617001953-ssg-static-site-generation.md](.workaholic/tickets/todo/a-qmu-jp/20260617001953-ssg-static-site-generation.md)),
unblocked once T3 lands.

## Implementation Steps

1. Add `Defect.ts` (see Patches) + colocated spec; export from
   `Exceptionals/index.ts`.
2. Add `toError`/`panic` to `PlggError.ts` (see Patches) + specs. `toError`
   handles `unknown`: a `Defect` with an `Error` `cause` returns that `Error`;
   otherwise synthesize `new Error` from the tag + any `content.message`.
3. Drop the `extends Error` bound from `Procedural`, `tryCatch`, `conclude`
   (default `E`/`F` unconstrained, `Procedural`'s default `= Defect`).
4. Confirm `proc` still type-checks unchanged under the relaxed `Procedural`
   (its overloads still return `Result<…, Error>` for now — fine, `Error`
   satisfies the default).
5. `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh` green; rebuild `plgg`.

## Patches

### `packages/plgg/src/Exceptionals/Defect.ts` (new)

```ts
import {
  Box,
  SoftStr,
  Option,
  box,
  pattern,
  fromNullable,
} from "plgg/index";

/**
 * The bottom error: an *unexpected* throw,
 * normalized to data at a throw-boundary
 * (`proc`'s catch, `tryCatch`'s default).
 * Domain code returns `err(typedError)` and
 * never produces a Defect itself. `cause` keeps
 * the original thrown value — usually a JS Error
 * with a stack — so a bug stays debuggable while
 * expected failures carry no stack noise.
 */
export type Defect = Box<
  "Defect",
  { message: SoftStr; cause: Option<unknown> }
>;

export const defect = (
  message: SoftStr,
  cause?: unknown,
): Defect =>
  box("Defect")({
    message,
    cause: fromNullable(cause),
  });

export const defect$ = () =>
  pattern("Defect")();
```

### `packages/plgg/src/Grammaticals/Procedural.ts`

```diff
 export type Procedural<
   T,
-  U extends Error = Error,
+  E = Defect,
 > = [T] extends [never]
   ? never
-  : PossiblyPromise<PossiblyResult<T, U>>;
+  : PossiblyPromise<PossiblyResult<T, E>>;
```

### `packages/plgg/src/Functionals/tryCatch.ts` / `conclude.ts`

```diff
-function tryCatch<T, U, E = Error>(
+function tryCatch<T, U, E = Defect>(
```
```diff
-  <T, U, F extends Error>(
+  <T, U, F>(
     fn: (item: T) => Result<U, F>,
```

### `toError` / `panic` (added to `PlggError.ts`)

```ts
/** Extract or synthesize a real Error from any
 * tagged error, for handing to Error-expecting
 * systems. A Defect with an Error cause returns
 * it (origin stack preserved); otherwise a new
 * Error is synthesized (boundary stack). */
export const toError = (e: unknown): Error =>
  e instanceof Error
    ? e
    : isDefectWithErrorCause(e)
      ? causeError(e)
      : new Error(describe(e));

/** Throw at an outer seam that demands it. */
export const panic = (e: unknown): never => {
  throw toError(e);
};
```
> `isDefectWithErrorCause`/`causeError`/`describe` are small guards in
> `PlggError.ts` that read `__tag`/`content` via `isBox`/`isObj`/`hasProp`
> (no `as`). Finalize their exact form against `tsc`.

## Considerations

- **Backward compatibility is the whole point of T1.** Do NOT convert any error
  class to data here and do NOT delete `BaseError`/`Exception` — that is T2.
  Keeping classes means the relaxed (now unconstrained) `E` is a strict
  superset of the old `Error`-bounded one, so every existing call site still
  type-checks. (`packages/plgg/src/Exceptionals/*`)
- **`proc`'s `Error` return stays for now.** Its catch still wraps into
  `Exception`; T2 switches that to `defect(...)` once `Defect` is the idiom and
  T3 reworks the error-union return type. (`packages/plgg/src/Flowables/proc.ts`)
- **`toError` must not use `as`.** It observes `unknown`; narrow with
  `instanceof Error`, `isBox`, `isObj`, and property guards.
  (`packages/plgg/src/Exceptionals/PlggError.ts`)
- **Coverage >90%** — `Defect`, `toError`, `panic` each get specs.

## Final Report

Development completed as planned.

### Discovered Insights

- **Insight**: `Procedural`'s default was kept `= Error` (not `= Defect` as the
  patch sketched) to preserve zero call-site churn.
  **Context**: changing the default to `Defect` would re-type every existing
  `proc` step's `Procedural<B>` slot, breaking steps that return
  `Result<_, Error>`/`Result<_, InvalidError>` (the class errors are `Error`s,
  not `Defect`s). Dropping only the *constraint* while keeping the default makes
  the new bound a strict superset — the actual additive, green change. The
  `Defect` floor moves to T3 when `proc`'s return is reworked.
- **Insight**: `match` requires **≥2 pattern arms** (TS overloads accept 2–20),
  so a single-variant `Box` like `Defect` cannot be folded alone in a test.
  **Context**: `Defect.spec.ts` folds a `Defect | InvalidError` union to
  exercise `defect$()`. Future single-tag matchers need a second arm (or a
  wildcard) to type-check.
