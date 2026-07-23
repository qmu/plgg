# plgg-http

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

The **runtime-neutral HTTP model** built **from scratch on [plgg](../plgg/)** —
pure data and pure builders for requests, responses, statuses, methods, and the
HTTP failure vocabulary. No `node:http`, no `fetch`, no DOM: just the wire
vocabulary, shared by both [`plgg-server`](../plgg-server/) (which adds the
`Web`/`Routing`/`View` layer and the native request/response seam) and
[`plgg-fetch`](../plgg-fetch/) (which adds the typed `fetch` client). The only
runtime dependency is `plgg`.

## Why this package exists

plgg-server and plgg-fetch are **symmetric peers** — both speak the same HTTP
model. Originally plgg-fetch imported that model from plgg-server, but a peer
importing a peer violates the repo's dependency doctrine (peers depend only on
plgg core and shared lower layers, never on each other). The resolution is to
**extract the shared model below both**:

```
plgg ── plgg-http ─┬─ plgg-server
                   └─ plgg-fetch
```

This is the inverse of the plgg-router/plgg-server `Segment` decision, and the
rule it completes: **parallel-define small clones (~a screenful); extract-below
large shared vocabularies.** The HTTP model is large and identical on both
sides, so it gets one home here rather than being cloned.

## The model

| Concern | Type / helpers |
|--------|----------------|
| HTTP method | `Method` (`Box` union) · `METHODS` · `isMethod` · `asMethod` |
| status code | `HttpStatus` = `Box<"HttpStatus", number>` · `isHttpStatus` · `asHttpStatus` · `statusOf` |
| request | `HttpRequest` (pure data) · `withParams` · `getHeader` · `getQuery` · `getParam` · `getBytes` |
| response | `HttpResponse` · `ResponseBody` · `textResponse` · `htmlResponse` · `jsonResponse` · `bytesResponse` · `streamResponse` · `redirectResponse` · `bytesBody` · `streamBody` |
| failure | `HttpError` (`Box` union) · constructors (`notFound`/`badRequest`/`unauthorized`/`forbidden`/`methodNotAllowed`/`unsupported`/`statusError`/`internalError`) · matchers (`notFound$`/…) · `httpErrorToResponse` |

Everything is pure plgg data: lookups are `Option`, validation is `Result`,
unions are `Box`, and failures are values matched by name (`notFound$()`), never
by tag string. There are no platform globals — the package imports safely on a
server, in a browser, or under SSR.

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root `CLAUDE.md`); unknown inputs
  are narrowed with plgg type guards, `Option`, and `Result`.
- After editing `plgg` core, run `npm run build` in `packages/plgg` or this package
  won't see new exports (the dependency is a symlinked `file:` dist).
