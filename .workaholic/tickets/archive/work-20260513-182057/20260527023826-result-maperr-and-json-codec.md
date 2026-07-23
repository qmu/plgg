---
created_at: 2026-05-27T02:38:26+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 1h
commit_hash: 5045f36
category: Added
depends_on:
---

# plgg core: `Result.mapErr` (+ eliminator) and a safe JSON codec

## Overview

Bridging validation failures into HTTP responses is lossy today. plgg `cast`
yields `Result<_, InvalidError>`, but plgg core `Result`
(`src/plgg/src/Disjunctives/Result.ts`) has `mapResult`/`chainResult` but **no
`mapErr`** (error-channel map) and no case eliminator (`matchResult`/`foldResult`).
So `src/plgg-web/example.ts` bridges with `toOption` + `okOr(badRequest("generic string"))`,
**discarding the real `InvalidError.message`**. There is also no safe JSON
decode — the example hand-rolls `tryCatch((s) => JSON.parse(s))`.

Goal (plgg core, with knock-on cleanup in plgg-web):
- Add `mapErr` (map the `Err` channel) — and consider a `matchResult(onErr, onOk)` / `foldResult` eliminator — to `Result`, exported via the barrel.
- Add a small `decodeJson` (and `encodeJson`) returning `Result`, so body parsing is a plgg combinator rather than ad-hoc `tryCatch`.
- Then a body handler can carry the validation message into the response, e.g. `decodeJson(body) |> mapErr(badRequest) ... cast(...) |> mapErr((e) => badRequest(e.message))`.

## Key Files

- `src/plgg/src/Disjunctives/Result.ts` — `resultFunctor`/`mapResult`, `resultChain`/`chainResult`, `resultFoldable` (foldr/foldl). Add `mapErr` and (optionally) `matchResult`/`foldResult`. Mirror the existing `Option` additions: `matchOption`, `okOr`, `getOr` (`src/plgg/src/Disjunctives/Option.ts`).
- `src/plgg/src/Disjunctives/Result.spec.ts` — unit tests for the new combinators.
- `src/plgg/src/Functionals/tryCatch.ts` / `src/plgg/src/Disjunctives/JsonReady.ts` — `decodeJson`/`encodeJson` belong in `Functionals` (or near `JsonReady`); reuse `tryCatch` for the throwing `JSON.parse`. Export via `src/plgg/src/index.ts`.
- `src/plgg-web/src/Http/model/HttpError.ts` — `badRequest` is the target of `mapErr` bridging.
- `src/plgg-web/example.ts` — refactor `parseJson` + `POST /users` to use `decodeJson` + `mapErr` and surface `InvalidError.message`.

## Implementation Steps

1. Add `mapErr<E, F>(f: (e: E) => F) => <T>(r: Result<T, E>) => Result<T, F>` to `Result.ts` (data-last). Optionally add `matchResult(onErr, onOk)` / `foldResult` as the case eliminator (parallels `matchOption`).
2. Add `decodeJson(text: SoftStr): Result<unknown, InvalidError>` (wrap `JSON.parse` via `tryCatch`, map the thrown error to `InvalidError`); optionally `encodeJson`. Place in `Functionals` and export from the root barrel.
3. Unit-test each in plgg core; keep coverage > 90%. Rebuild plgg dist (`npm run build` in `src/plgg`) so plgg-web sees the new exports (symlink).
4. Refactor `src/plgg-web/example.ts` `POST /users`: `decodeJson(c.req.body)` then `asNewUser`, bridging each `InvalidError` into `badRequest(e.message)` via `mapErr` — so the 400 body carries the real reason instead of a hard-coded string.
5. Expression-bodied / plgg-native; no `as`/`any`/`@ts-ignore`.

## Considerations

- This is primarily a **plgg core** change (Domain), with plgg-web as the consumer/acceptance. Keep the additions minimal and orthogonal — `mapErr` is the must-have; the JSON codec is the natural companion for web bodies.
- A `matchResult`/`foldResult` eliminator complements the recently-added `matchOption`/`okOr`; include it if it stays small. The match-completeness lineage (`src/plgg/docs/match-type-completeness.md`) is unrelated to these value-level combinators.
- Acceptance: a plgg-web POST handler conveys the real validation message into the 400 with no `as`.

## Final Report

Development completed as planned. Added `mapErr` and `matchResult` to core `Result`, and a `decodeJson`/`encodeJson` codec pair in `Functionals/jsonCodec.ts`. The plgg-web `POST /users` now bridges both fallible steps with `mapErr((e: InvalidError) => badRequest(e.message))`, so a 400 carries the real reason. The `parseJson` helper and the `tryCatch`/`toOption` imports it needed were removed.

### Discovered Insights

- **Insight**: `mapErr` (and any data-last combinator whose only generic appears in the *callback's* parameter) cannot infer that parameter's type from `pipe` position — the curried `mapErr(f)` is type-checked before the input `Result` is known. Callers must annotate the lambda parameter (`mapErr((e: InvalidError) => ...)`).
  **Context**: `mapResult`'s callback parameter happened to be fine unannotated only because its consumers (`jsonResponse`) accept `unknown`; `mapErr` reads `e.message`, which forces the annotation. This is a usage gotcha, not a bug — expect explicit error-type annotations at every `mapErr` site.
- **Insight**: plgg's `dist/` is gitignored; plgg-web consumes plgg through a symlink that resolves to `dist/` (via `main`/`module`/`types`). After any change to plgg core, you MUST run `npm run build` in `src/plgg` before plgg-web's tsc/vitest will see the new exports — but the rebuilt `dist/` is never committed.
  **Context**: Forgetting the rebuild yields confusing "module has no exported member" errors in plgg-web against perfectly valid core source.
