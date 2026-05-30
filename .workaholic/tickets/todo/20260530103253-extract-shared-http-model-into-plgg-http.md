---
created_at: 2026-05-30T10:32:53+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on:
---

# Extract the shared HTTP model into a neutral `plgg-http` package

## Overview

`plgg-fetch` depends on `plgg-server` purely to reuse the **HTTP model**
(`HttpError`, `HttpRequest`, `HttpResponse`/`ResponseBody`, `Method`, `statusOf`).
That edge violates the repo doctrine that **peer experimental packages don't
import each other — only plgg core and immediate dependencies** (the same rule
that made plgg-router define `Segment` in parallel rather than import plgg-server's).
For the path machinery the answer was *parallel definition* (~150 small lines).
For the HTTP model that answer is wrong: it is a large, semantically identical
*wire vocabulary* used verbatim on both sides — cloning it would invite drift.

The right resolution is **extraction to a shared lower layer**: a new
runtime-neutral `plgg-http` package holding the pure HTTP model, depended on by
**both** `plgg-server` and `plgg-fetch`. This is clean layering (a shared
dependency), not a peer importing a peer:

```
plgg ── plgg-http ─┬─ plgg-server   (adds Web/Routing/View/Serving + native seam)
                   └─ plgg-fetch     (adds the fetch client + NetworkError)
```

After this, `plgg-fetch` and `plgg-server` are **true peers** — neither imports
the other — and the HTTP vocabulary has one home.

### Why a new package, not plgg core

The HTTP model is domain-specific (request/response/status/method/error), not a
foundational FP primitive like `Result`/`Option`/`pipe`. It does not belong in
`packages/plgg` (core stays the general toolkit, and is deliberately frozen for
this work). A dedicated `plgg-http` keeps core clean while giving the two HTTP
packages a shared base. (Alternative homes are weighed in Open Questions.)

## What moves vs. what stays

**Move to `plgg-http`** (runtime-neutral, pure data + pure builders — no
`node:http`, no `fetch`):

- `Http/model/Method.ts` — `Method`, `METHODS`, `isMethod`, `asMethod`
- `Http/model/HttpStatus.ts` — `HttpStatus`, `isHttpStatus`, `asHttpStatus`, `statusOf`
- `Http/model/HttpRequest.ts` — `HttpRequest`, `withParams`, `getHeader`, `getQuery`, `getParam`, `getBytes`
- `Http/model/HttpResponse.ts` — `ResponseBody`, `bytesBody`, `streamBody`, `HttpResponse`, `textResponse`, `htmlResponse`, `jsonResponse`, `bytesResponse`, `streamResponse`, `redirectResponse`
- `Http/model/HttpError.ts` — `HttpError`, all constructors (`notFound`/`badRequest`/`methodNotAllowed`/`unsupported`/`unauthorized`/`forbidden`/`statusError`/`internalError`), all matchers (`notFound$`/…), `httpErrorToResponse`
- The colocated `*.spec.ts` for each of the five.

**Stay in `plgg-server`** (server-only — middleware context + native Request/
Response seam):

- `Http/model/Context.ts`, `Http/model/Handler.ts`
- `Http/usecase/{toHttpRequest,toNativeResponse,seam}.ts`
- all of `Routing/`, `View/`, `Serving/`

`plgg-server`'s root barrel keeps re-exporting the model (via `plgg-http`) so its
internal consumers (`Routing/model/{Web,Route}`, `Routing/usecase/{dispatch,
compileRoutes,handle,toFetch}`, `View/usecase/response`) and external users keep
importing `HttpError`/`HttpResponse`/… from `"plgg-server"` unchanged.

## Key Files

### New — `packages/plgg-http`
- Scaffold mirroring a small plgg package: `package.json` (dep: `plgg` only;
  `.`-keyed `exports`), strict `tsconfig.json` + `tsconfig.build.json`,
  `vite.config.ts` (lib `index` entry, dts, ≥90% coverage thresholds), `README.md`.
- `src/Http/model/{Method,HttpStatus,HttpRequest,HttpResponse,HttpError}.ts`
  (+ specs) moved verbatim, with internal `plgg-server/...` path imports rewritten
  to `plgg-http/...`.
- `src/Http/model/index.ts`, `src/Http/index.ts`, `src/index.ts` barrels.
- `scripts/test-plgg-http.sh` / `tsc-plgg-http.sh` (+ watch variants) mirroring the
  existing per-package scripts.

### `packages/plgg-server`
- Delete the five moved model files (+ specs). `Http/model/index.ts` becomes
  `export * from "plgg-http"; export * from ".../Context"; export * from ".../Handler";`.
- Add `plgg-http` to `dependencies`. Verify `Context.ts`/`Handler.ts`/the seam
  usecases import the model from `plgg-http` (or via the re-export) with no `as`/`any`.

### `packages/plgg-fetch`
- Repoint the four `from "plgg-server"` imports (`Http/model/ClientError.ts`,
  `Http/usecase/{request,seam,decode}.ts`) and the three specs to `"plgg-http"`.
- Swap `plgg-server` → `plgg-http` in `dependencies`. README: note it now shares
  the HTTP model via `plgg-http`, no longer depends on `plgg-server`.

### Build wiring
- `scripts/build.sh`: build `plgg-http` right after plgg core, before
  `plgg-server` and `plgg-fetch`.
- `scripts/check-all.sh`: add `test-plgg-http.sh` (before server/fetch).
- Root `README.md`: add `plgg-http` to Project Structure + Sub-packages; update the
  plgg-fetch entry ("symmetric peer of plgg-server; both build on plgg-http").

## Related History

- [20260527142356-create-plgg-http-client.md](.workaholic/tickets/archive/plgg-http-client/20260527142356-create-plgg-http-client.md) — created plgg-fetch as the "symmetric companion of plgg-server", *deliberately* reusing plgg-server's HTTP model by import. This ticket revisits that decision: the symmetry is real, but the shared model should live below both, not inside one.
- [20260527023825-http-failure-vocabulary.md](.workaholic/tickets/archive/work-20260513-182057/20260527023825-http-failure-vocabulary.md) — established the `HttpError` `Box`-union vocabulary (`notFound$`/`badRequest$`/…) the client matches over; it travels to plgg-http intact.
- [20260528193321-rename-plgg-http-client-to-plgg-fetch.md](.workaholic/tickets/archive/work-20260528-143038/20260528193321-rename-plgg-http-client-to-plgg-fetch.md) — the rename that left the plgg-fetch→plgg-server dep in place.
- [20260529003601-add-plgg-router.md](.workaholic/tickets/archive/work-20260528-143038/20260529003601-add-plgg-router.md) — the "peers define in parallel, don't import" doctrine. This ticket is its complement: when the shared surface is large and identical, *extract below* instead of cloning.

## Implementation Steps (phased, green at every commit)

1. **Scaffold `plgg-http` + move the model.** Create the package (configs,
   barrels, scripts). Move the five model files + specs in, rewriting internal
   imports to `plgg-http/...`. Build + test plgg-http standalone (`tsc` clean,
   vitest green, ≥90% coverage). Nothing else changed yet, so the repo is green
   only after step 2 wires plgg-server — so do steps 1–2 as one commit, or have
   plgg-server keep its copies until step 2 (prefer: 1+2 together to stay green).
2. **plgg-server consumes plgg-http.** Add the dep; delete the moved files; make
   `Http/model/index` re-export `plgg-http` + `Context` + `Handler`. Confirm
   Routing/View/Serving and `example.ts` still type-check and tests pass
   (`from "plgg-server"` still yields the whole model). Green.
3. **plgg-fetch consumes plgg-http.** Repoint imports + swap the dep
   (`plgg-server` → `plgg-http`). Confirm no `plgg-server` reference remains in
   `packages/plgg-fetch`. Green.
4. **Wire build + docs.** Update `build.sh` order, `check-all.sh`, the per-package
   scripts, and the root README. `scripts/check-all.sh` green end-to-end.

## Considerations

- **No `as`/`any`/`ts-ignore`** (CLAUDE.md). The move is mechanical; imports change,
  logic does not. Watch for any `plgg-server/...` path-alias import inside the moved
  files — rewrite to `plgg-http/...`.
- **Backward-compatible server surface.** Keep `HttpError`/`HttpResponse`/… exported
  from `"plgg-server"` (via re-export) so no server-side call site or the example
  changes. The only behavioral change is the dependency graph.
- **Coverage parity.** plgg-http inherits the moved specs; it should land ≥90%
  immediately (the model files are already well-tested). plgg-server's coverage may
  shift (fewer files) — confirm it still clears its 91% thresholds.
- **`statusOf` / response builders are pure.** They construct `HttpResponse`/
  `HttpStatus` data with no platform API, so they belong in plgg-http. The *native*
  conversions (`toHttpRequest`, `toNativeResponse`) stay in plgg-server.
- **Doctrine alignment.** This is the inverse of the plgg-router/Segment decision and
  should be documented as such: *parallel-define small clones; extract-below large
  shared vocabularies.* Add a sentence to plgg-http's README.
- **Scaffolding parity.** plgg-http keeps the strict tsconfig, vite lib+dts, the
  `.`-keyed `exports` (the canonical style — see the sibling export-unification
  ticket), and ≥90% coverage, like the other packages.

## Open Questions (decide during implementation, document in Final Report)

- **Package name** — `plgg-http` (recommended: matches `plgg-server`/`plgg-fetch`
  naming and reads as "the HTTP model layer"). Alternative: `plgg-http-core`.
- **Home: new package vs. plgg core vs. a `plgg/Http` submodule** — recommend the
  new package (core stays general + frozen; a submodule of core would still bloat
  core). Confirm.
- **Should `Context`/`Handler` also move?** No — they are server middleware
  concepts (request + threaded state, `Result`-returning handler). plgg-fetch has no
  use for them. Keep in plgg-server. (Re-confirm nothing in plgg-fetch needs them.)
- **Re-export vs. direct imports in plgg-server.** Recommend plgg-server *re-exports*
  plgg-http from its barrel (zero call-site churn). Optionally, a follow-up could
  repoint server-internal imports straight at plgg-http; not required here.
