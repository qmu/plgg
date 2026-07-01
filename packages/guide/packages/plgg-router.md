# plgg-router

A **pure client-side path toolkit**, built from scratch
on [plgg](/packages/plgg/). It compiles a route pattern
into `Segment`s, matches a concrete pathname (capturing
`:param`s and a trailing `*wildcard`), and parses the
query string — returning **data, never a view**. No DOM,
no History API; its only runtime dependency is `plgg`.

## plgg-router vs plgg-server's `Routing`

- **plgg-server's `Routing`** is *server-side*: it
  matches an incoming request path to an `HttpResponse`
  (method-aware, `Result`/`HttpError`).
- **plgg-router** is *client-side path matching*: it
  turns the current path + query into a `Location` —
  pure data an app maps to a route in its `Model`.

They share the same vocabulary — `Segment`, `:param`,
`*wildcard` — **by parallel definition, not by import**
(peer packages don't depend on each other). It is
consumed by [plgg-view](/packages/plgg-view)'s
`application` runtime, which owns the `Url → Model → Html`
loop.

## The model

| Concern | Type |
|---------|------|
| string values | `SoftStr` |
| param / query maps | `Dict<string, SoftStr>` |
| compiled segment | `Segment = Box<"Static" \| "Param" \| "Wildcard", SoftStr>` |
| matched location | `Location = { path, params, query }` |
| lookups | `Option<SoftStr>` |

## Usecases

| Function | Signature |
|----------|-----------|
| `compilePattern` | `(pattern) => ReadonlyArray<Segment>` |
| `matchSegments` | `(segments, pathname) => Option<Dict>` |
| `parseQuery` | `(search) => Dict<string, SoftStr>` |
| `param` | `(name) => (loc) => Option<SoftStr>` |
| `query` | `(name) => (loc) => Option<SoftStr>` |
| `makeLocation` | `(path, params?, query?) => Location` |

```typescript
import {
  compilePattern, matchSegments,
  parseQuery, makeLocation, param, query,
} from "plgg-router";
import { pipe, getOr, isSome } from "plgg";

const userRoute = compilePattern("/users/:id");
isSome(matchSegments(userRoute, "/users/42")); // true

const loc = makeLocation(
  "/users/42",
  { id: "42" },
  parseQuery("?tab=posts"),
);
pipe(loc, param("id"), getOr("?")); // "42"
pipe(loc, query("tab"), getOr("")); // "posts"
```

**Static** segments match verbatim; **params** capture
one segment; a **wildcard** captures the remainder and is
terminal. To resolve a route table, scan compiled
patterns in registration order and take the first
`matchSegments` success (so register a `*` catch-all
last). Keys and params are percent-decoded, degrading to
the raw token on malformed input. No third-party runtime
deps (`history`/`path-to-regexp`/`qs`) — all plgg-native.
