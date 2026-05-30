# plgg-server

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

A server-side web router and HTTP request handler built **from scratch on the
[plgg](../plgg/) framework**. This package is a dogfooding exercise: the entire
domain is expressed in plgg types and combinators, and where plgg lacked a
primitive it was added to plgg core (e.g. `fromNullable`, `getOr`, `toOption`
for `Option`). The only runtime dependency is `plgg`.

Platform types (Web-standard `Request`/`Response`, `node:http`, `Bun.serve`,
`Deno.serve`) appear **only at the seam** — two converter functions and a
single adapter file per host runtime. Everything inward is plgg, and the root
entry imports nothing runtime-specific, so the same `plgg-server` core runs on
Node, Bun, Deno, Cloudflare Workers, Deno Deploy, and any other Web-standard JS
runtime.

## The plgg-native model

| Concern | Type |
|--------|------|
| string values (headers, params, query, body, path) | `SoftStr` |
| header / query / param maps | `Dict<string, SoftStr>` |
| status code | `HttpStatus` = `Box<"HttpStatus", number>` (validated 100–599) |
| request | `HttpRequest` (all fields plgg types) |
| response | `HttpResponse` = `{ status, headers, body }` |
| failures | `HttpError` — a `Box` union (`NotFound`, `MethodNotAllowed`, `BadRequest`, `Unsupported`, `InternalError`) |
| lookups | `Option<SoftStr>` |
| handler result | `PromisedResult<HttpResponse, HttpError>` |

Handlers return **errors as values** via `Result` — no exceptions, no raw
`Response`.

## Quick Start

The app is built the plgg way — a `pipe` of data-last `Web => Web` transformers,
**not** a method chain. See [`example.ts`](./example.ts) for a runnable version.

```typescript
import {
  web, use, get, post, toFetch,
  param, textResponse, jsonResponse, notFound,
} from "plgg-server";
import { serve } from "plgg-server/node";
import { pipe, ok, mapOption, getOr, okOr } from "plgg";

const app = pipe(
  web(),
  // onion-model middleware, same Result contract
  use(async (c, next) => {
    const res = await next();
    return res; // inspect/transform the Result here
  }),
  // Each handler is one flat pipeline; `textResponse`/`jsonResponse` and
  // `ok`/`okOr` are just the trailing steps — no nested `ok(builder(...))`.
  get("/", async () => pipe("Hello, plgg-server!", textResponse, ok)),
  get("/users/:id", async (c) =>
    pipe(
      c,
      param("id"), // Context -> Option<SoftStr>
      mapOption((id) => jsonResponse({ id })),
      okOr(notFound(c.req.path)), // Option -> Result<_, HttpError>
    ),
  ),
  post("/users", async (c) =>
    // c.req.body is a SoftStr; validate it with plgg `cast`
    pipe({ created: c.req.body }, jsonResponse, ok),
  ),
);

// Serve over node:http (Web Request/Response live only at this seam).
// Swap `plgg-server/node` for `plgg-server/bun` or `plgg-server/deno` to
// deploy on those runtimes without touching `app`.
pipe(
  app,
  toFetch,
  serve({ port: 3000 }, () =>
    console.log("listening on http://localhost:3000"),
  ),
);
```

## Two entry points

A `Web` value has no methods. It is run by two standalone, data-last functions:

- **`handle(app, request: HttpRequest): PromisedResult<HttpResponse, HttpError>`**
  — the plgg-native core. Ideal for unit tests; no platform types involved.
- **`toFetch(app)`** → `(request: Request) => Promise<Response>` — the seam. It
  is curried because it is used as a pipeline step
  (`pipe(app, toFetch, serve(...))`); it converts a Web `Request` into an
  `HttpRequest`, runs `handle`, and folds the result (including any `HttpError`)
  into a Web `Response`.

```typescript
import { handle } from "plgg-server";
import { isOk } from "plgg";

const result = await handle(app, {
  method: "GET",
  path: "/users/7",
  query: {},
  headers: {},
  params: {},
  body: "",
});
// result: Result<HttpResponse, HttpError>
```

## Routing

- **Static** segments match verbatim: `/health`.
- **Params** capture one segment: `/users/:id` → `pipe(c, param("id"))`.
- **Wildcards** capture the remainder: `/files/*` (named `*`) or `/files/*path`.
- Path params are percent-decoded; malformed encodings fall back to the raw
  value. Compiled segments are a plgg `Box` union (`Static` / `Param` /
  `Wildcard`).

Verb helpers: `get`, `post`, `put`, `patch`, `del` (DELETE — `delete` is a
reserved word), `head`, `options`, plus `on(method, path, handler)`. Each is a
data-last `Web => Web` transformer you drop into a `pipe`; they never mutate.
Mount sub-apps with `route(basePath, sub)`.

## The Context (`c`)

`Context` is **pure data** — `{ req, state }`, no methods. You read and write it
with standalone, data-last functions threaded through `pipe`
(`pipe(c, param("id"))`), and you build response bodies with standalone
constructors. The state bag is immutable: `setState` returns a *new* `Context`,
and middleware threads it downstream via `next(pipe(c, setState(...)))`.

| Function | Description |
|--------|-------------|
| `c.req` | the `HttpRequest` (`method`, `path`, `query`, `headers`, `params`, `body`) |
| `pipe(c, param(name))` / `query(name)` / `header(name)` | `Option<SoftStr>` lookups |
| `pipe(c, getState(key))` → `Option` / `pipe(c, setState(key, value))` → new `Context` | immutable per-request state bag |
| `jsonResponse(data, status?)` | JSON `HttpResponse` |
| `textResponse(body, status?)` / `htmlResponse(body, status?)` | text / HTML `HttpResponse` |
| `redirectResponse(location, status = 302)` | redirect `HttpResponse` |

## Dispatch outcomes (as `HttpError` values)

- no route matched → `NotFound` → `404`
- path matched, method did not → `MethodNotAllowed` → `405` + `Allow`
- unsupported request method → `Unsupported` → `501`
- handler threw → `InternalError` → `500`

`httpErrorToResponse` folds any `HttpError` into its `HttpResponse`.

## Runtime adapters

The root entry (`plgg-server`) is runtime-neutral: it ships the request
pipeline, the routing, the View helpers, and `toFetch`. To bind that core to a
real HTTP server, import the adapter for the host runtime — each one exposes the
same data-last `serve(options, onListen?)(handler)` shape, so the only line that
changes between deployments is the `import`:

| Runtime | Import | Notes |
|--|--|--|
| Node | `import { serve } from "plgg-server/node"` | Backed by `node:http` (`createServer`, `req.on('data')`, `res.write`). Returns `http.Server`. |
| Bun | `import { serve } from "plgg-server/bun"` | Backed by `Bun.serve`. Returns `Bun.Server`. |
| Deno | `import { serve } from "plgg-server/deno"` | Backed by `Deno.serve`. Returns `Deno.HttpServer`. |
| Cloudflare Workers / Deno Deploy / browser fetch | `import { toFetch } from "plgg-server"` and `export default { fetch: toFetch(app) }` | `toFetch(app)` *is* a Web-standard `(Request) => Promise<Response>` handler. No adapter file needed — the runtime's `fetch` event consumes it directly. |

Each `serve` is data-last in its handler so it terminates a routing pipeline:

```typescript
pipe(app, toFetch, serve({ port: 3000 }))
```

The converters `toRequest` / `writeResponse` (Node) and `toHttpRequest` /
`toNativeResponse` (Web-standard, shared) bridge platform types ↔ plgg's
`HttpRequest` / `HttpResponse`, lifting nullable platform fields through plgg's
`Option` (`fromNullable` / `getOr`) rather than ad-hoc defaulting.
