---
created_at: 2026-05-27T02:38:24+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on:
---

# Compile the plgg-web route table (method index + static map + segment trie)

## Overview

`dispatch` resolves a request by scanning **every** registered route on **every**
request. In `src/plgg-web/src/Routing/usecase/dispatch.ts` it does:

```
routes.map((route) => ({ route, match: matchSegments(route.segments, request.path) }))
  → .filter((c) => isSome(c.match))
  → fromNullable(matching.find((c) => c.route.method === request.method))
```

So it runs `matchSegments` against all routes (regardless of method), allocates
intermediate arrays in three passes, and only checks the HTTP method **after**
the path already matched. Cost is `O(routes × segment-depth)` per request with no
fast path for fully-static paths and no index by method.

Goal: build a **compiled route structure once** (at registration or on first
dispatch) so lookup is roughly `O(path-depth)`: index by HTTP method first, an
`O(1)` exact-match map for fully-static patterns, and a segment trie for
`:param` / `*` routes tried in registration order (stopping at the first match).
Route patterns are already pre-compiled to `Segment[]` by `compilePattern`; this
adds structure beyond the flat `routes` array. Match semantics must be identical.

## Key Files

- `src/plgg-web/src/Routing/usecase/dispatch.ts` — the linear scan + `compose` (onion middleware) + `runMatched`. The match/allowed/404/405 logic to preserve.
- `src/plgg-web/src/Routing/model/Web.ts` — `Web = { routes, middlewares }`, `web()`, registrars, `route()`. The compiled table likely hangs off the `Web` value or is derived in `handle`/`toFetch`.
- `src/plgg-web/src/Routing/usecase/compilePattern.ts` — `compilePattern`/`splitPath`; segments are `Static` / `Param` / `Wildcard` (`Routing/model/Segment.ts`, a `Box` union).
- `src/plgg-web/src/Routing/usecase/matchSegments.ts` — current per-route matcher (reduce + `chainOption`); the trie should reuse its decode/capture semantics (percent-decoding via `safeDecode`, wildcard captures the remainder).
- `src/plgg-web/src/Routing/model/Route.ts` — `Route = { method, pattern, segments, handler }`.
- `src/plgg-web/src/Routing/usecase/dispatch.spec.ts` / `matchSegments.spec.ts` / `Routing/model/Web.spec.ts` — behavioral guardrails (404, 405+Allow, param capture, wildcard, onion order).

## Implementation Steps

1. Define a compiled structure: `Map<Method, MethodTable>` where `MethodTable` holds (a) a `Map<staticPath, Route>` for patterns with only `Static` segments, and (b) an ordered structure (list or trie keyed by segment) for `Param`/`Wildcard` routes.
2. Build it once from `web().routes` (memoize on the `Web` value, or compile in `handle`/`toFetch`). Keep `web()`/registrars returning pure data; compilation is a pure derivation.
3. Rewrite `dispatch` lookup: select by `request.method` → try the static map (exact) → else walk the param/wildcard structure, capturing params, stopping at the first match. Compute `Allow` (405) by which methods have a matching path. Preserve `NotFound`/`MethodNotAllowed`/percent-decode/wildcard-remainder behavior exactly.
4. Keep everything expression-bodied / plgg-native (no `const`/`if`/`for`/`return` statements in bodies; `pipe`/`match`/array combinators / recursion). No `as`/`any`/`@ts-ignore`.
5. Verify with the existing Routing specs unchanged in behavior; add a test asserting a static path no longer depends on scanning unrelated routes (e.g. order-independence / many-route sanity).

## Considerations

- Coordinate with the scoped-middleware ticket (`20260527023823-scoped-group-middleware.md`): the compiled table is the natural place to associate middleware with route subsets, so that ticket depends on this one.
- Match results must be byte-for-byte equivalent — this is a performance refactor, not a semantics change. Keep `matchSegments` (or its core) for the param/trie leaves.
- plgg-web is a study package (`UNSTABLE`); micro-benchmarks are optional, but the structural change (no full scan for static hits) is the deliverable.
