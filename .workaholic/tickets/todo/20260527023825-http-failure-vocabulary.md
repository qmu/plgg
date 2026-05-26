---
created_at: 2026-05-27T02:38:25+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# Extend `HttpError` with 401/403 (and a generic status failure)

## Overview

The `HttpError` value vocabulary is too small for auth. In
`src/plgg-web/src/Http/model/HttpError.ts` it is a `Box` union of only:

```
NotFound(404) | MethodNotAllowed(405) | BadRequest(400) | Unsupported(501) | InternalError(500)
```

There is no `Unauthorized` (401), `Forbidden` (403), or a generic
`statusError(status, message)`. Auth/permission is core to real apps, yet
`src/plgg-web/example.ts` had to fake 401 as `ok(textResponse("Unauthorized", 401))`
— returning a *success* `Result` for a failure, breaking the error-as-value model.

Goal: handlers can express auth/permission failures as `HttpError` values
(`err(unauthorized(...))`, `err(forbidden(...))`, and/or `err(statusError(403, ...))`),
and `httpErrorToResponse` folds each to the correct status.

## Key Files

- `src/plgg-web/src/Http/model/HttpError.ts` — the `Box` union, its constructors (`notFound`/`methodNotAllowed`/`badRequest`/`unsupported`/`internalError`), the `unique` helper, and the total `httpErrorToResponse` fold (a ternary chain on `error.__tag`).
- `src/plgg-web/src/Http/model/HttpError.spec.ts` — variant + fold assertions to extend.
- `src/plgg-web/src/Http/model/HttpStatus.ts` — `HttpStatus`/`statusOf` (for a generic status variant).
- `src/plgg-web/src/Http/model/HttpResponse.ts` — `textResponse` used by the fold.

## Implementation Steps

1. Add variants: `Box<"Unauthorized", SoftStr>` and `Box<"Forbidden", SoftStr>`; optionally a general `Box<"StatusError", { status: HttpStatus; message: SoftStr }>` with a `statusError(status, message)` constructor for arbitrary codes.
2. Add the matching constructors (`unauthorized`, `forbidden`, and `statusError` if included), mirroring the existing ones (`box("...")(...)`).
3. Extend the total `httpErrorToResponse` ternary fold: Unauthorized → 401, Forbidden → 403, StatusError → its carried status. Keep it exhaustive (the existing chain ends at InternalError → 500).
4. Expression-bodied / plgg-native; no `as`/`any`/`@ts-ignore`; keep the `WWW-Authenticate` header out of scope unless trivial.
5. Tests: each new constructor + each new fold mapping in `HttpError.spec.ts`.
6. Refactor `example.ts`'s `/api/me` guard to `err(unauthorized(...))` instead of `ok(textResponse(..., 401))`.

## Considerations

- Engage the `leading-security` lens: 401 vs 403 semantics (unauthenticated vs unauthorized), and avoid leaking detail in messages.
- Decide between explicit variants (`unauthorized`/`forbidden`) vs a single generic `statusError`; explicit variants read better and keep the fold exhaustive, a generic one is open-ended. Both can coexist.
- Small, self-contained ticket — no dependency on the routing tickets.
