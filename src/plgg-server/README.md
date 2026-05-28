# plgg-server

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

A server-side web router and HTTP request handler built **from scratch on the
[plgg](../plgg/) framework**. This package is a dogfooding exercise: the entire
domain is expressed in plgg types and combinators, and where plgg lacked a
primitive it was added to plgg core (e.g. `fromNullable`, `getOr`, `toOption`
for `Option`). The only runtime dependency is `plgg`.

Platform types (Web-standard `Request`/`Response`, `node:http`) appear **only at
the seam** — two converter functions and the `node:http` adapter. Everything
inward is plgg.

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
  web, use, get, post, toFetch, serve,
  param, textResponse, jsonResponse, notFound,
} from "plgg-server";
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

## node:http adapter

`serve({ port, hostname? }, onListen?)` is data-last in its handler, so it ends a
routing pipeline: `pipe(app, toFetch, serve({ port: 3000 }))` returns the
`http.Server`. The converters `toRequest` / `writeResponse` bridge `node:http` ↔
Web `Request`/`Response`, lifting nullable platform fields through plgg's
`Option` (`fromNullable` / `getOr`) rather than ad-hoc defaulting.
