---
created_at: 2026-05-27T14:23:56+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 2h
commit_hash: 324c6a5
category: Added
---

# Create `plgg-http-client` — typed HTTP client (POC)

## Overview

Add a new monorepo package `src/plgg-http-client`: a **typed HTTP client** for
the presentation layer (`plgg-view`) to call the server (`plgg-http-router`).
Same plgg discipline as the router — requests/responses are pure plgg data,
failures are values, and native `fetch`/`Request`/`Response` appear **only at one
seam**. Depends on `plgg` and (for the shared HTTP model) `plgg-http-router`.

**Do the `rename-plgg-web-to-plgg-http-router` ticket first** — this package
reuses that renamed package's HTTP types.

This is an **UNSTABLE / EXPERIMENTAL POC**. The plgg doctrine is non-negotiable
(same as `plgg-http-router`): dogfood plgg types/combinators; extend plgg core
when a primitive is missing; `as`/`any`/`ts-ignore` STRICTLY PROHIBITED; no
OOP/method chaining; expression-only bodies; errors as values; platform types
only at the seam; strict coverage > 90%.

## Key Files

- `src/plgg-http-router/` - the renamed router; reuse its `HttpRequest` /
  `HttpResponse` / `HttpStatus` / `HttpError` / `Method` model
  (`dependencies: { "plgg-http-router": "file:../plgg-http-router" }`).
- `src/plgg-http-router/src/Http/` - the HTTP model + seam converters to mirror
  on the client side.
- `src/plgg-web/` (pre-rename) / `src/plgg-web/example.ts` - reference for
  package layout, currying convention, and example shape.
- `src/plgg/src/index.ts` - extend plgg core here if needed (then rebuild).
- `sh/check-all.sh`, `sh/npm-install.sh`, `sh/build.sh` - wire the package in.

## Implementation Steps

1. Scaffold `src/plgg-http-client/`: `package.json`
   (`dependencies: { plgg: "file:../plgg", "plgg-http-router":
   "file:../plgg-http-router" }`), `tsconfig.json`
   (`paths: { "plgg-http-client*": ["./src/*"] }`), `tsconfig.build.json`,
   `vite.config.ts` (lib es+cjs, dts, coverage 91, `external` the platform
   modules), `src/index.ts` barrel.
2. Reuse the router's HTTP model; add a client-only error variant (e.g.
   `NetworkError`) to the `HttpError` vocabulary where needed.
3. Implement `request(method, url, { headers?, query?, body? })` building an
   `HttpRequest`-equivalent, plus `get`/`post`/`put`/`patch`/`del`
   conveniences — all-args-in-one-call (they are not `pipe` steps), returning
   `PromisedResult<HttpResponse, HttpError>`.
4. Implement the seam: `toFetchRequest(req): Request` and
   `fromFetchResponse(res): PromisedResult<HttpResponse, HttpError>` — the only
   place Web platform types live. Network rejection → `HttpError`
   (`NetworkError`); a non-2xx status is still a valid `HttpResponse`.
5. Add a typed JSON decode helper on plgg `cast`
   (`pipe(res.body, decodeJson, chainResult(asMyType))`).
6. Add `sh/tsc-plgg-http-client.sh`, `sh/test-plgg-http-client.sh` (+ watch);
   wire into `sh/check-all.sh`, `sh/npm-install.sh`, `sh/build.sh`.
7. Add `README.md` + a runnable `example.ts` (`npx tsx`): a `GET` and a `POST`
   (can target the `plgg-http-router` example server) decoding into a typed value.
8. Ensure both packages' `tsc`/`test` scripts are green with coverage > 90%.

## Considerations

- **Document the non-2xx policy**: a non-2xx response is returned as a valid
  `HttpResponse` (caller decides), while transport/network failure folds to an
  `HttpError` — make this explicit in the README (`src/plgg-http-client/`).
- **Out of scope for this POC**: retries, interceptors/middleware, streaming,
  auth/cookie flows, request cancellation.
- Reusing `plgg-http-router` types keeps client/server symmetric, but creates an
  intra-worktree `file:` dependency that only resolves in this worktree (where
  the rename exists).
- `npm install` needed per package in this worktree (worktrees don't share
  `node_modules`); after editing `src/plgg/src`, `npm run build` in `src/plgg`.

## Final Report

Development completed as planned. New `src/plgg-http-client` package: reuses the
router's HTTP model, `request`/`get`/`post`/`put`/`patch`/`del` returning
`PromisedResult<HttpResponse, ClientError>`, a single `fetch` seam
(`toFetchRequest`/`fromFetchResponse`), and a `decodeJsonBody` helper on plgg
`cast`. tsc clean (incl. `example.ts`), **24 tests / 100% coverage**, both `es`
and `cjs` builds succeed.

### Discovered Insights

- **Insight**: A NodeNext consumer cannot see a `file:` dependency's types unless
  that package's `exports` map carries a `types` condition — the top-level
  `"types"` field is ignored once an `exports` map exists. `plgg-http-router`'s
  flat `exports` (`{ import, require }`) had to be nested into
  `{ import: { types, default }, require: { types, default } }` (mirroring
  `plgg`) before the client compiled. The router's own `tsc`/tests never caught
  this because it imports its own sources via the `plgg-http-router/*` path alias,
  not the built package.
  **Context**: Any future package that depends on a sibling via `file:` must
  ensure the sibling's `exports` exposes `types`; otherwise tsc reports an
  implicit-`any` module with no obvious cause.
- **Insight**: plgg's `tryCatch` has a sync overload declared before the async
  one, and a function returning `Promise<U>` matches the sync overload first
  (`Result<Promise<U>, E>`), so `tryCatch` is unreliable for wrapping async work.
  The seam therefore uses native `promise.then(onOk, onErr)` directly (the same
  pattern the router's `toHttpRequest` uses) — a sync throw inside a `.then`
  callback (e.g. a bad-URL `new URL()`) is converted to a rejection and caught by
  the next handler, so the whole build-and-fetch chain folds to `NetworkError`.
  **Context**: Prefer `.then(onOk, onErr)` over `tryCatch` for `Promise`-returning
  functions in this codebase until the overload order is revisited.
- **Insight**: `NetworkError` was kept as a client-side union member
  (`ClientError = HttpError | NetworkError`) rather than added to the router's
  shared `HttpError`. A transport failure is meaningless server-side (a server
  never has a network error answering itself) and would have become a dead branch
  in `httpErrorToResponse`. This preserves layer segregation while still sharing
  one HTTP vocabulary.
  **Context**: When a failure is intrinsic to one side of a shared model, extend
  the vocabulary at that layer rather than widening the shared type.
