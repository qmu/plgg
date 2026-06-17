---
created_at: 2026-06-17T08:12:21+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort: 2h
commit_hash: 94ea7b9
category: Changed
depends_on: [20260617081220-errors-as-data-migration.md]
---

# `proc` error-union inference + collapse SSG/HTTP onto `proc`

## Overview

Part 3 of 3. With errors now pure data (T2) and the bounds relaxed (T1), make
`proc` carry the **exact** error union statically — `proc(...)` infers
`Result<Last, E₁ | E₂ | … | Defect>` instead of erasing to `Error`. Then reap
it: collapse the hand-threaded SSG usecases and drop the
`.then(mapErr(toHttpError))` tail from HTTP handlers. This is the part with the
genuine TypeScript difficulty, isolated here so it can't destabilize the data
migration.

## Key Files

- `packages/plgg/src/Flowables/proc.ts` - rework the ~20 overloads to infer the
  per-step error union; collapse the `catch` to
  `err(defect("Unhandled throw in proc", e))`.
- `packages/plgg/src/Grammaticals/Procedural.ts` - the per-step `E` the inference
  reads.
- `packages/plgg-server/src/Ssg/usecase/renderRoutes.ts` - collapse
  `renderPath`/`renderRoutes` onto `proc` (drop the `await`+`chainResult`
  hand-threading) — once the SSG ticket has landed; otherwise this is folded
  into the SSG ticket's implementation directly.
- `packages/plgg-http` / `packages/plgg-server` routing handlers - drop the
  `mapErr(toHttpError)` tail where `proc` now carries `HttpError`.

## Related History

Depends on
[20260617081220-errors-as-data-migration.md](.workaholic/tickets/todo/a-qmu-jp/20260617081220-errors-as-data-migration.md).
Unblocks the proc-native form of the SSG ticket
([20260617001953-ssg-static-site-generation.md](.workaholic/tickets/todo/a-qmu-jp/20260617001953-ssg-static-site-generation.md)).

## Implementation Steps

1. Add a per-step error-union helper (`ProcErr<…>` / extract `E` from each
   `Procedural<B, E>` step) and thread it through all overloads so the return is
   `Result<UnwrapProcedural<Last>, StepErrors | Defect>`.
2. Collapse `proc`'s `catch` to a single `err(defect(...))` (a thrown value is
   unexpected by definition).
3. Verify the 11 existing `proc` call sites still type-check; narrow their
   `onErr` by `__tag` where they previously saw `Error`.
4. Collapse the SSG usecases onto `proc`; drop HTTP handlers'
   `mapErr(toHttpError)` tail where applicable.
5. `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh` green; rebuild `plgg`.

## Patches

### `packages/plgg/src/Flowables/proc.ts` — catch + return (illustrative)

```diff
       } catch (e: unknown) {
-        return isPlggError(e)
-          ? err(e)
-          : e instanceof Error
-            ? err(new Exception("Unexpected error in proc", e))
-            : err(new Exception("Unknown error in proc"));
+        return err(defect("Unhandled throw in proc", e));
       }
```
```diff
- ): Promise<Result<UnwrapProcedural<B>, Error>>;
+ ): Promise<Result<UnwrapProcedural<B>, ProcErr<[AB]> | Defect>>;
```

## Considerations

- **The fallback ladder for `proc` inference (do not use `as`).** Aim for full
  per-step union inference. If TS variadic-tuple inference resists `tsc`:
  (a) infer via a `ProcErr<[...fns]>` mapped tuple type; (b) a single declared
  `proc<…, E>` the caller annotates once; (c) worst case
  `Result<T, unknown | Defect>` narrowed by `__tag`. Never force it with a cast.
  (`packages/plgg/src/Flowables/proc.ts`)
- **Huge unions / slow `tsc`.** A long `proc` yields a wide `E₁ | … | Defect`;
  watch compile time and error-message legibility. If unwieldy, consider a
  `Defect`-only mode for long pipelines and the precise union for short ones.
- **Sequencing with SSG.** If the SSG ticket lands before this, its `proc`
  collapse moves here; if after, SSG is written proc-native from the start and
  this ticket only touches `proc` + HTTP. Set the SSG ticket's `depends_on`
  accordingly.

## Final Report

Development completed. The precise per-step error-union inference **landed
cleanly** — `proc(a, f1, f2, …)` now infers
`Result<UnwrapProcedural<RLast>, ProcErr<A> | ProcErr<RB> | … | Defect>` with
the full monorepo green (tsc 0, all tests) and **zero `as`/`any`/`ts-ignore`**.
A type-level assertion in `proc.spec.ts` locks the inferred union so a future
refactor can't silently collapse it back to `unknown`.

### Discovered Insights

- **Insight**: the dual-inference collapse was sidestepped by **not inferring
  `E` against the `Procedural<T,E>` union target at all**.
  **Context**: the overload type params became the *raw return types*
  (`RB`, `RC`, …) inferred from each step function's actual return (always
  unambiguous, one type var), then decomposed afterward — `UnwrapProcedural<R>`
  for success and a new `ProcErr<R> = ProcErrInner<Awaited<R>>` for the error
  (non-distributive at entry, then distributes over the `Ok|Err` union so
  `Err<infer E>` recovers `E`). Inferring the whole concrete return type and
  decomposing it dodges the bare-`T`-arm ambiguity that collapses `E` to
  `unknown`.
- **Insight**: `ProcErr<A>` is included for the **seed** argument, not just the
  steps.
  **Context**: a `proc` seed can itself be a `Procedural` carrying an error
  (e.g. `bind()` returns `Result<_, Error>`); omitting the seed's error narrowed
  the union and broke a pre-existing `bind.spec.ts` cast. Unioning `ProcErr<A>`
  recovers it.
- **Insight**: the only caller-facing change is **cosmetic** — `proc`'s explicit
  type args now denote raw-return types, not success types. No real call site
  (in or out of the repo) passes explicit args; downstream annotates
  `PromisedResult<_, unknown>`, to which the precise union is assignable, so
  nothing broke. The 3 explicit-arg calls in `proc.spec.ts` were fixed by
  letting inference run.
- **Insight**: the "collapse SSG/HTTP onto `proc`" half of this ticket is a
  **no-op right now** — SSG doesn't exist yet and HTTP handlers already annotate
  their precise channels. SSG will be born `proc`-native on the precise union;
  dropping any `mapErr(toHttpError)` tails is folded into that ticket.
- **Insight**: a higher-perspective multi-lens review of the whole error
  redesign confirmed the design is sound but surfaced foundation defects to fix
  before SSG — two **P0**s (`printPlggError` cycle crash; `bind`/`tryCatch` still
  minting raw `Error` + pre-existing `as` casts) and several P1s (tag-only
  `isPlggError`, `Defect` cause lost across JSON, `cast` throw-stack loss, no
  error-message accessor). Captured as follow-up tickets.
