---
created_at: 2026-06-10T12:29:28+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on:
---

# Bound request bodies and add socket/header/request timeouts (node adapter)

## Overview

The node serving adapter buffers the entire request body in memory with **no
size cap and no `Content-Length` check**, and it sets **no socket, header, or
request timeouts**. Both are denial-of-service vectors:

- **Unbounded body (HIGH):** `collectBody` pushes every `data` chunk into an
  array and `Buffer.concat`s at `end`, with no limit. Buffering happens *before*
  routing, so even requests to nonexistent paths can be used to exhaust heap and
  crash the process with a few concurrent large/streaming uploads.
- **No timeouts (MEDIUM):** without `requestTimeout`/`headersTimeout`/socket
  timeout, slow-drip (slowloris) clients hold connections open; `collectBody`'s
  promise never resolves and sockets accumulate. Node's defaults blunt the
  classic form, but the adapter should set its own bounds rather than rely on
  runtime defaults.

These are grouped because they live in the same file and both belong on a single
new `ServeOptions` surface for request hardening.

## Key Files

- `packages/plgg-server/src/Serving/usecase/serve.ts` (`collectBody` lines 25-40; `createServer`/`listen` lines 150-174) — the node adapter; both fixes land here.
- `packages/plgg-server/src/Serving/model/` — `ServeOptions`/serve config type to extend with `maxBodyBytes` and timeout fields.
- `packages/plgg-http/src/Http/model/HttpError.ts` — `statusError`/413 path for the over-limit response (reuse the existing typed error vocabulary; do not throw).
- `packages/example/src/server.ts` / `main.ts` — confirms how `serve` is invoked so new options have sane defaults and the example still works.

## Implementation Steps

1. Add a configurable `maxBodyBytes` (default a sane value, e.g. 1 MiB) to the serve options type.
2. In `collectBody`, accumulate a running byte total in the `data` listener; when it exceeds the cap, `req.destroy()` and reject/resolve into a typed 413 (`Payload Too Large`) via the existing `HttpError` vocabulary — never throw a raw error. Optionally short-circuit early when `req.headers["content-length"]` already exceeds the cap.
3. Add `requestTimeout`, `headersTimeout`, and a `server.setTimeout(...)` (idle socket) configuration, surfaced through serve options with conservative defaults. Apply them on the `createServer`/returned server.
4. Ensure the 413 and timeout paths fold into the same typed `HttpResponse`/`HttpError` channel the rest of the adapter uses, so nothing leaks a stack trace (the adapter already emits a constant `Internal Server Error` for thrown handlers — keep that property).
5. Tests: a body exceeding the cap yields 413 and the socket is destroyed; a request under the cap still works; confirm option plumbing and defaults.

## Considerations

- This is the **Capacity and Recovery Planning** policy in practice (`standards:operation`): hold "how much can it handle" in a simple, explicit form from the build stage — a body cap and timeouts are the concrete RTO/RPO-adjacent guards against trivial exhaustion, kept minimal rather than over-planned. (`packages/plgg-server/src/Serving/usecase/serve.ts`)
- Touches **Observability and Self-Healing** (`standards:operation`): rejecting oversized/slow requests is a self-healing input; make the rejection observable (typed error, not a silent drop). 
- Keep the Bun/Deno adapters in mind: they hand the native `Request` to the runtime and don't share `collectBody`; document that the cap/timeouts here are node-adapter-specific (or thread equivalent options where the runtimes expose them) so behavior is not silently divergent. (`packages/plgg-server/src/bun.ts`, `deno.ts`)
- Use the existing `HttpError` typed vocabulary and `Result`/`Option` channels — strict no-`as`/`any`/`ts-ignore` (CLAUDE.md). Keep coverage >90% including the new branches.
