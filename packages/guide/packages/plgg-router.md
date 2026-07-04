# plgg-router

A **pure client-side path toolkit**, built from scratch
on [plgg](/packages/plgg/). It compiles a route pattern
into `Segment`s, matches a concrete pathname (capturing
`:param`s and a trailing `*wildcard`), and parses the
query string — returning **data, never a view**. No DOM,
no History API; its only runtime dependency is `plgg`.

## Writing an app with it

Compile a pattern once, then turn the current path +
query into a [`Location`](/packages/plgg/) — pure data.
Lookups are [`Option`](/concepts/option) and reads are
data-last [`pipe`](/concepts/composition)s:

```typescript
import { pipe, getOr, isSome } from "plgg";
import {
  compilePattern,
  matchSegments,
  parseQuery,
  makeLocation,
  param,
  query,
} from "plgg-router";

// Compile a pattern once, match a concrete path.
const userRoute = compilePattern("/users/:id");
isSome(matchSegments(userRoute, "/users/42")); // true

// Turn the current path + query into a Location —
// pure data an app folds into its Model.
const loc = makeLocation(
  "/users/42",
  { id: "42" },
  parseQuery("?tab=posts"),
);

// Read captured params and query, data-last.
pipe(loc, param("id"), getOr("?")); // "42"
pipe(loc, query("tab"), getOr("")); // "posts"
```

Because it returns data, never a view, the same
`Location` folds into an app's `Model` under
[plgg-view](/packages/plgg-view)'s `application` runtime,
which owns the `Url → Model → Html` loop.

## Vocabulary

The toolkit is a small vocabulary of pure plgg data,
grouped by concern:

- **pattern → segments** — `compilePattern` turns a route
  string into `ReadonlyArray<Segment>`, where `Segment` is
  a [`Box`](/concepts/tagged-data) union of
  `Static | Param | Wildcard`.
- **path → match** — `matchSegments` matches a concrete
  pathname against compiled `Segment`s, capturing
  `:param`s and a trailing `*wildcard` as an
  [`Option`](/concepts/option)`<Dict>`.
- **query** — `parseQuery` parses a search string into a
  `Dict<string, SoftStr>`.
- **location** — `Location` (`{ path, params, query }`),
  built with `makeLocation`, is the resolved route data an
  app folds into its `Model`.
- **lookups** — `param`/`query` read a captured value as
  an [`Option`](/concepts/option)`<SoftStr>`, data-last:
  `pipe(loc, param("id"))`.

Everything is pure plgg data — lookups are
[`Option`](/concepts/option), maps are `Dict`, segments
are [`Box`](/concepts/tagged-data) — with no DOM and no
History API. The exact types and the full function list
live in the `The model` and `Usecases` tables below.

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
