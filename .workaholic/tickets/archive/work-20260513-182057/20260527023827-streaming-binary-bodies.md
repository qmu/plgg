---
created_at: 2026-05-27T02:38:27+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash: daadcdb
category: Changed
depends_on:
---

# Support binary / streaming request and response bodies

## Overview

plgg-web can only handle text bodies. `HttpResponse.body` is typed `SoftStr`
(`src/plgg-web/src/Http/model/HttpResponse.ts`) and `toHttpRequest` does
`await request.text()` (`src/plgg-web/src/Http/usecase/toHttpRequest.ts`). So
there is no way to return binary (`Uint8Array`) or streamed responses (file
downloads), read large/binary request bodies, or set `Content-Length` /
use chunked transfer. This is the biggest gap before plgg-web handles real
traffic. **Flag: largest of the five tickets** — widens the core model and the
seam converters.

Goal: a plgg-native body representation that admits text, bytes, and streams,
with the Web `Response`/`node:http` conversions confined to the seam. The text
path must be unchanged for existing handlers.

## Key Files

- `src/plgg-web/src/Http/model/HttpResponse.ts` — `HttpResponse = { status, headers, body: SoftStr }` and the `textResponse`/`jsonResponse`/`htmlResponse`/`redirectResponse` builders. Body type must widen (e.g. a `Box` union: text | bytes | stream) with new builders (e.g. `bytesResponse`, `streamResponse`).
- `src/plgg-web/src/Http/model/HttpRequest.ts` — `HttpRequest.body: SoftStr`; needs to carry raw bytes when the body is not text.
- `src/plgg-web/src/Http/usecase/toNativeResponse.ts` — converts to Web `Response`; must map the widened body to a `BodyInit` (string | Uint8Array | stream) at the seam.
- `src/plgg-web/src/Http/usecase/toHttpRequest.ts` — currently `await request.text()`; must optionally surface bytes (`arrayBuffer()`), guided by content-type or a per-route opt-in.
- `src/plgg-web/src/Serving/usecase/serve.ts` — node:http seam (`collectBody`, `toRequest`, `writeResponse`); already the irreducible imperative adapter — extend it to pass through bytes/streams and set `Content-Length`.
- `Http/model/HttpResponse.spec.ts`, `Http/usecase/seam.spec.ts`, `Serving/usecase/serve.spec.ts` — tests.

## Implementation Steps

1. Model the body as a plgg-native union — text (`SoftStr`), bytes (`Uint8Array`), and stream (a plgg representation, with the platform `ReadableStream` only at the seam). Keep `HttpResponse.body` backward-readable for the text builders.
2. Add response builders for bytes (and stream): e.g. `bytesResponse(data, status?, headers?)`, `streamResponse(...)`. Keep `textResponse`/`jsonResponse`/`htmlResponse` producing the text variant unchanged.
3. Update `toNativeResponse` to fold the body union into the appropriate `BodyInit`; set `Content-Length` for known-length bodies.
4. Update request ingestion (`toHttpRequest` + `serve`'s `collectBody`/`toRequest`) to surface raw bytes when the body is not text (content-type sniff or explicit opt-in); keep the default text path intact.
5. Confine all platform stream/`BodyInit`/`ReadableStream` types to the seam (`Http/usecase`, `Serving/usecase`); the domain model stays plgg-native.
6. Expression-bodied / plgg-native in domain code (the node:http seam in `serve.ts` may remain imperative, as documented); no `as`/`any`/`@ts-ignore`.
7. Tests: return a binary response (assert bytes + `Content-Length`), read a binary request body, and confirm the text path is unchanged.

## Considerations

- Largest scope here — consider sub-phasing: (a) binary `Uint8Array` bodies first (finite length, simplest), (b) streaming second.
- The `node:http` adapter (`serve.ts`) is already the acknowledged imperative seam (EventEmitter → Promise, ServerResponse mutation); streaming naturally lives there. Keep `Request`/`Response`/stream types out of the domain model.
- No dependency on the other four tickets.

## Final Report

Development completed as planned, covering both sub-phases (binary bytes and streaming). The response body widened to a `ResponseBody` union, request binary support was added via a separate `bytes` field (not by widening `body`), and the seam converters plus `serve`'s write path were extended. All platform stream/`BodyInit`/`ReadableStream` types stay in `Http/usecase` and `Serving/usecase`.

### Discovered Insights

- **Insight**: Request binary support was added as a *new* `bytes: Option<Uint8Array>` field rather than by widening `HttpRequest.body` to a union. Widening `body` would have broken `example.ts`'s `decodeJson(c.req.body)` (which needs `SoftStr`) and every handler reading `c.req.body` as text. Keeping `body` as text and adding `bytes` alongside preserves the text path with zero handler churn — the "keep the text path intact" constraint forced this shape.
  **Context**: The response side could widen `body` safely because text stays a bare `SoftStr` within the union (only bytes/stream are `Box`-tagged), so `r.body === "hi"` still holds; the request side could not, because `decodeJson`'s parameter type is invariant.
- **Insight**: `new Response(uint8Array, ...)` fails to typecheck under the current lib's `Uint8Array<ArrayBufferLike>` generic (not assignable to `BodyInit`), even though `new Request(url, { body: arrayBuffer })` is fine. The fix is to copy the view into a standalone `ArrayBuffer` at the seam (the same pattern `serve.ts`'s `collectBody` already uses) — no `as` needed.
  **Context**: A future contributor hitting the same `BodyInit` error should reach for the `ArrayBuffer` copy, not a cast.
- **Insight**: `writeResponse` now streams `response.body` through its `ReadableStream` reader (promise-chained recursion) instead of buffering via `arrayBuffer()`. This unifies all three body kinds: text/bytes carry an explicit `Content-Length` (set in `toNativeResponse`) and stream bodies fall back to chunked transfer-encoding automatically when no length header is present.
  **Context**: An empty body (e.g. a redirect) yields `response.body === null`, handled by a plain `res.end()`; the reader path is skipped.
