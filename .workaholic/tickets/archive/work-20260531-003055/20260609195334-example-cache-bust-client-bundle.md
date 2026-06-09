---
created_at: 2026-06-09T19:53:34+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 0.5h
commit_hash: 556d000
category: Changed
depends_on:
---

# Cache-bust the example's client bundle (versioned `/main.js` URL + no-cache headers)

## Overview

The SSR demo serves its client bundle at a **fixed, unversioned URL with no
cache validators**: `server.ts` emits `<script src="/main.js">` and serves the
bytes via `javascriptResponse(body)` with no `Cache-Control`/`ETag`. Because the
filename never changes (`vite build` lib mode → fixed `dist/main.js`, no content
hash) and the response carries no caching headers, any caching layer — the
browser's HTTP cache, **or Cloudflare's edge** (which DevTools "Disable cache"
cannot bypass) — is free to keep serving an old `main.js` indefinitely.

Observed symptom: after an edit + rebuild + container swap, the page renders the
new server HTML for a moment and then the **stale client bundle re-renders over
it** (e.g. a red SSR heading snaps back to black on CSR takeover). This makes
*every* client-side change invisible — it's why the keyed-reconcile + FLIP work
appeared to "do nothing." Confirmed root cause via an independent Codex pass:
no service worker, no watchtower interference, no rogue container — purely the
unversioned, header-less bundle URL.

Fix: stamp the bundle URL with a content hash so each build yields a fresh URL,
and send revalidation headers so no layer serves a stale copy.

## Key Files

- `packages/example/src/server.ts` — emits `clientEntry: "/main.js"` and serves
  `/main.js` via `javascriptResponse(body)` with no cache headers. Both the
  script URL and the response headers change here.
- `packages/plgg-server/src/View/usecase/response.ts` — confirms the API
  supports the fix: `pageResponse(opts, …)` takes `HtmlDocumentOptions`
  (carrying `clientEntry`), and `javascriptResponse(body, status, headers)`
  accepts a headers `Dict` — so no plgg-server change is required.

## Related History

- [20260609185443-plgg-view-keyed-reconcile-flip.md](.workaholic/tickets/todo/20260609185443-plgg-view-keyed-reconcile-flip.md) — The feature whose effect was masked by this delivery bug; both touch the same demo. This fix unblocks visual verification of that ticket.
- [20260604154845-example-animate-todo-items.md](.workaholic/tickets/archive/work-20260531-003055/20260604154845-example-animate-todo-items.md) — Prior example/SSR+CSR work on the same `server.ts`/`app.ts` demo surface.

## Implementation Steps

1. In `packages/example/src/server.ts`, import `createHash` from `node:crypto`.
2. Compute the bundle hash **once at startup** from the same bytes the server
   already reads: hash `readFileSync(BUNDLE_PATH)` (or fold over the existing
   `readBundle` `Result`), take the first ~16 hex chars as `BUNDLE_VERSION`.
   Degrade gracefully if the bundle is missing (the existing 404 path) — fall
   back to a constant token so SSR still renders.
3. Change the `get("/")` handler's `pageResponse({ … clientEntry })` to
   `clientEntry: \`/main.js?v=${BUNDLE_VERSION}\``. The `/main.js` route matches
   by path, so the query string still routes correctly — no route change needed.
4. In the `get("/main.js")` handler, pass cache headers to `javascriptResponse`:
   `javascriptResponse(body, 200, { "cache-control": "no-cache", "etag": \`"${BUNDLE_VERSION}"\` })`.
   (`no-cache` = always revalidate; the `ETag` lets a revalidation 304 when the
   hash is unchanged.)
5. Verify: `scripts/tsc-plgg.sh` clean; rebuild the example bundle and the
   server; `curl -s http://localhost:3001/ | grep -o 'src="/main.js?v=[0-9a-f]*"'`
   shows a hash; `curl -sD - http://localhost:3001/main.js -o /dev/null | grep -i 'cache-control\|etag'`
   shows the headers. Then rebuild + swap the Docker container (`plgg-example`,
   `-p 3001:3000`) and hard-reload `https://plgg-example.qmu.dev` to confirm the
   page no longer reverts to the stale bundle.

## Considerations

- **No escape hatches** — derive the hash with `node:crypto` and the existing
  `Result`/`pipe`/`matchResult` primitives already in `server.ts`; no `as`/`any`
  (`packages/example/src/server.ts`).
- **Startup vs per-request hashing** — hash once at module load (the bundle is
  immutable for the process lifetime); do not re-hash per request.
- **Server is excluded from coverage** — `src/server.ts` is in vite.config.ts's
  coverage `exclude`, so this needs no unit test; verification is the curl checks
  above (`packages/example/vite.config.ts`).
- **Out of scope** — switching `vite build` to hashed filenames (`main.[hash].js`)
  would also work but changes the build/serve contract more invasively; the
  query-param + headers approach is the minimal fix and keeps the fixed-filename
  bundle the SSR server reads off disk.
- **Reverting the diagnostic** — the temporary red wrapper color
  (`sx.color("danger")` in `app.ts`) is unrelated to this ticket and is reverted
  separately once delivery is confirmed working.

## Final Report

Development completed as planned. Implemented exactly per the steps: a startup
SHA-256 of `dist/main.js` (first 16 hex) stamped into both `clientEntry`
(`/main.js?v=<hash>`) and an `ETag`, with `Cache-Control: no-cache` on the
bundle response — all via `node:crypto` + the existing `Result`/`pipe`/
`matchResult` style, no escape hatches. Verified on the origin: SSR HTML emits
`src="/main.js?v=f772e26ad8eb4e42"` and `/main.js` returns
`cache-control: no-cache` + matching `ETag`. The developer confirmed the page
stops reverting to the stale bundle after a reload of the public (Cloudflare
Access + tunnel) URL.

### Discovered Insights

- **Insight**: The SSR+CSR demo's "changes don't show up" was never a code or
  cache-_setting_ problem — it was the unversioned, header-less `/main.js`
  letting the browser **and Cloudflare's edge** serve a stale bundle.
  **Context**: The tell is a brief flash of correct SSR output that then snaps
  to the old state when the stale client bundle hydrates over it. Because
  styling is atomic/content-hashed, fresh client code reuses the same class and
  stays correct; a revert proves the *client bytes* are stale, not the render
  logic. Future client-visible changes to the demo should be verified through
  the public URL only after confirming the `?v=` token changed.
- **Insight**: The dev Docker image (`workloads/development/Dockerfile`) bakes
  source at build time (`COPY . .` + `npm run build`, no volume mount), so a
  container *restart* never picks up edits — the image must be rebuilt and the
  container recreated. **Context**: Combined with the cache bug above, this made
  iteration especially opaque; a future improvement is a volume-mounted dev
  container with a watcher (out of scope here).
