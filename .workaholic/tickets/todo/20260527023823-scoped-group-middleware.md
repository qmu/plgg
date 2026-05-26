---
created_at: 2026-05-27T02:38:23+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260527023824-compiled-route-table.md]
---

# Scope `route()`-mounted middleware to its group (no app-wide leak)

## Overview

Mounting a sub-app leaks its middleware to the **entire** app. In
`src/plgg-web/src/Routing/model/Web.ts`, `route(basePath, sub)` does:

```
middlewares: [...app.middlewares, ...sub.middlewares]
```

so a `use()` registered inside the sub-app runs for every route, not just the
mounted prefix. Confirmed live while building `src/plgg-web/example.ts`: a
`route("/api", api)` whose `api` had `use(requireAuth)` made **every** route
(including `/`) return 401. There is also no per-route middleware. As a result
the example had to inline its auth guard instead of using group middleware.

Goal: middleware registered on a mounted sub-app (and/or attached to a route)
runs **only** for that group's routes, while top-level `use()` stays global.
Onion ordering and immutable state-threading (`next(setState(...)(c))`) must be
preserved.

## Key Files

- `src/plgg-web/src/Routing/model/Web.ts` — `Web = { routes, middlewares }`, `use`, `route` (the leaking merge), the registrars.
- `src/plgg-web/src/Routing/usecase/dispatch.ts` — `compose` builds the onion from a single flat `middlewares` array; this must instead apply the middleware that scopes to the matched route.
- `src/plgg-web/src/Routing/model/Route.ts` — `Route`; candidate place to carry the middleware stack that applies to each route.
- `src/plgg-web/src/Http/model/Handler.ts` — `Middleware` / `Next` (unchanged contract: `PromisedResult<HttpResponse, HttpError>`).
- `src/plgg-web/src/Routing/model/Web.spec.ts` — onion-order and `route()` tests to extend.

## Implementation Steps

1. Decide the model: attach the applicable middleware stack **per route** (so a route carries `[...ancestorGroupMiddleware]`), rather than one flat app-level array. `route(base, sub)` should bind `sub`'s middleware to `sub`'s (rebased) routes only; top-level `use()` applies to all.
2. Update `route()` so a sub-app's middleware is recorded against its routes (not merged into the parent's global stack). Preserve rebasing of paths (`joinPath`).
3. Update `dispatch`/`compose` to build the onion from the **matched route's** middleware stack (global → group → route order) instead of the single `middlewares` array.
4. Keep `use()` ordering semantics: outermost-first onion; state threads via `next(updated)`.
5. Expression-bodied / plgg-native throughout; no `as`/`any`/`@ts-ignore`.
6. Tests: group middleware runs only for its prefix (the example's `requireAuth` case), top-level middleware still global, onion order preserved across global+group, nested `route()` groups compose.

## Considerations

- **Depends on** the compiled route table (`20260527023824-compiled-route-table.md`): associating middleware with route subsets is cleanest once routes are a structured table rather than a flat list. Sequence this after that ticket.
- Consider whether to also expose per-route middleware (e.g. an `on`/verb variant taking middleware) or keep it group-only via `route()`. Group-only is the minimum that fixes the leak.
- Preserve the existing security-relevant behavior expectation: a guard mounted on `/api` must not run for `/`, and—critically—must actually run for everything under `/api` (no gaps). Engage the `leading-security` lens for the auth-gating semantics.
