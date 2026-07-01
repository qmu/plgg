# plgg-server

A server-side web router and HTTP handler, built from
scratch on [plgg](/packages/plgg/) over the shared
[plgg-http](/packages/plgg-http) model. Platform types
(Web `Request`/`Response`, `node:http`, `Bun.serve`,
`Deno.serve`) appear **only at the seam** — everything
inward is plgg. The runtime-neutral root imports nothing
platform-specific, so the same core runs on Node, Bun,
Deno, Cloudflare Workers, and any Web-standard runtime.

## The model

| Concern | Type |
|---------|------|
| string values | `SoftStr` |
| header / query / param maps | `Dict<string, SoftStr>` |
| status | `HttpStatus = Box<"HttpStatus", number>` (100–599) |
| request | `HttpRequest` |
| response | `HttpResponse = { status, headers, body }` |
| failures | `HttpError` (`NotFound`, `MethodNotAllowed`, `BadRequest`, `Unsupported`, `InternalError`) |
| handler result | `PromisedResult<HttpResponse, HttpError>` |

Handlers return **errors as values** — no exceptions, no
raw `Response`.

## Building an app — a `pipe`, not a chain

A `Web` value has no methods; you build it as a
[data-last `pipe`](/concepts/composition) of
`Web => Web` transformers:

```typescript
import {
  web, use, get, post, toFetch,
  param, textResponse, jsonResponse, notFound,
} from "plgg-server";
import { serve } from "plgg-server/node";
import { pipe, ok, mapOption, okOr } from "plgg";

const app = pipe(
  web(),
  use(async (c, next) => await next()), // onion middleware
  get("/", async () =>
    pipe("Hello, plgg-server!", textResponse, ok),
  ),
  get("/users/:id", async (c) =>
    pipe(
      c,
      param("id"),                       // Context -> Option<SoftStr>
      mapOption((id) => jsonResponse({ id })),
      okOr(notFound(c.req.path)),         // Option -> Result<_, HttpError>
    ),
  ),
);

pipe(app, toFetch, serve({ port: 3000 }));
```

Verb helpers: `get`, `post`, `put`, `patch`, `del`
(DELETE — `delete` is reserved), `head`, `options`, plus
`on(method, path, handler)`. Mount sub-apps with
`route(basePath, sub)`.

## Two entry points

- **`handle(app, request)`** → `PromisedResult<HttpResponse, HttpError>`
  — the plgg-native core; ideal for tests, no platform
  types.
- **`toFetch(app)`** → `(request: Request) => Promise<Response>`
  — the seam; curried so it terminates a pipeline. It
  converts a Web `Request` to an `HttpRequest`, runs
  `handle`, and folds the result (including `HttpError`)
  into a Web `Response`.

## The Context (`c`)

`Context` is **pure data** — `{ req, state }`, no
methods. Read it with data-last functions
(`pipe(c, param("id"))`, `query`, `header`), and thread
immutable per-request state with `getState`/`setState`
(which returns a *new* `Context`). Build responses with
`jsonResponse`/`textResponse`/`htmlResponse`/`redirectResponse`.

Dispatch outcomes are `HttpError` values: no match →
`NotFound`/404; method mismatch → `MethodNotAllowed`/405;
unsupported method → `Unsupported`/501; handler threw →
`InternalError`/500. `httpErrorToResponse` folds any of
them to an `HttpResponse`.

## Runtime adapters

The root entry is runtime-neutral; bind it to a host by
importing one adapter — each exposes the same data-last
`serve(options, onListen?)(handler)`, so only the import
line changes between deployments:

| Runtime | Import |
|---------|--------|
| Node | `import { serve } from "plgg-server/node"` |
| Bun | `import { serve } from "plgg-server/bun"` |
| Deno | `import { serve } from "plgg-server/deno"` |
| Workers / Deno Deploy / browser | `export default { fetch: toFetch(app) }` |

`toFetch(app)` *is* a Web-standard handler, so the last
row needs no adapter file — the runtime's `fetch` event
consumes it directly.

## View — SSR

The View layer renders [plgg-view](/packages/plgg-view)
`Html<Msg>` server-side: `htmlDocument` wraps a rendered
root in a full document, and `pageResponse({ title, root, … })`
folds it into an `HttpResponse` for first-paint SSR.

## Static site generation (`plgg-server/ssg`)

`generateStatic` renders routes to static HTML at build
time, **reusing the real router and SSR path**: for each
path it synthesizes a GET request, runs `handle(app, req)`
(so routing + middleware run and the output is
byte-identical to live SSR), and writes
`<outDir>/<path>/index.html`.

```typescript
import { generateStatic } from "plgg-server/ssg";
import { matchResult } from "plgg";

await generateStatic(app)({
  paths: ["/", "/about"],
  outDir: "dist/site",
}).then(
  matchResult(
    (e) => console.error("build failed", e),
    (files) => console.log("wrote", files),
  ),
);
```

It is **strict** — a non-2xx status, a non-string body,
an `HttpError`, or a failed write folds to a typed
`SsgError` and fails the build:
`generateStatic(app)(config)` returns
`PromisedResult<ReadonlyArray<SoftStr>, SsgError | Defect>`.
`node:fs` is confined to the `plgg-server/ssg` entry (as
`node:http` is confined to `plgg-server/node`), so the
root stays Workers/Deno-portable. Output is HTML only
(first-paint / SEO / no-JS); see
[`example/src/build.ts`](/packages/example).

## Worked example

[`packages/example`](/packages/example) ties routing +
View + SSR together — one Elm-Architecture program
rendered both server-side and in the browser.
