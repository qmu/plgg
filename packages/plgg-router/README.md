# plgg-router

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

A **pure client-side path toolkit** built **from scratch on the
[plgg](../plgg/) framework**. It compiles a route pattern into `Segment`s,
matches a concrete pathname (capturing `:param`s and a trailing `*wildcard`),
and parses the query string — returning *data*, never a view. There is no DOM,
no History API, and no view dependency: the toolkit is consumed by
[plgg-view](../plgg-view/)'s `application` runtime, which owns the
`Url → Model → Html` loop and the `popstate`/link-interception seam. The only
runtime dependency is `plgg`.

## Naming: `plgg-router` vs. plgg-server's `Routing`

The word "router" has history in this repo (`plgg-web → plgg-http-router →
plgg-server`), so to be unambiguous:

- **plgg-server's `Routing`** is *server-side*: it matches an incoming request
  path to an `HttpResponse` (method-aware, `Result`/`HttpError`).
- **plgg-router** is *client-side path matching*: it turns the browser's current
  path + query into a `Location` (path, captured params, parsed query) — pure
  data an app maps to a route in its `Model`.

The two share the same path vocabulary — `Segment`, `:param`, `*wildcard` — **by
parallel definition, not by import**: peer experimental packages don't depend on
each other (see [Considerations](#considerations)), so the pure path machinery
is cloned rather than coupled. A reader of both packages sees the same words
mean the same things.

## The plgg-native model

| Concern | Type |
|--------|------|
| string values (path, params, query) | `SoftStr` |
| param / query maps | `Dict<string, SoftStr>` |
| compiled path segment | `Segment` = `Box<"Static" \| "Param" \| "Wildcard", SoftStr>` |
| a matched location | `Location` = `{ path, params, query }` (pure data) |
| lookups | `Option<SoftStr>` |

Lookups are `Option`, never raw strings; everything here is **pure, immutable
data and pure functions** — no classes, no methods, no platform globals.

## One entry point

The package is a single environment-agnostic core import — `plgg-router`. It has
no `window`/`history`/`document`, so it is safe to import anywhere, including
under SSR/Node. (Earlier revisions shipped a `plgg-router/client` DOM/History
seam and a `Location → VNode` router; both moved into plgg-view's `application`
runtime when the view layer became an Elm Architecture.)

## The usecases

| Function | Signature | Description |
|--------|-----------|-------------|
| `compilePattern` | `(pattern) => ReadonlyArray<Segment>` | compiles `/users/:id` / `/files/*path` / `*` into segments |
| `matchSegments` | `(segments, pathname) => Option<Dict>` | matches a pathname, returning captured params on success |
| `parseQuery` | `(search) => Dict<string, SoftStr>` | parses `?k=v&…` into a `Dict` (percent-decoded) |
| `param` | `(name) => (loc) => Option<SoftStr>` | reads a captured path param: `pipe(loc, param("id"))` |
| `query` | `(name) => (loc) => Option<SoftStr>` | reads a query param: `pipe(loc, query("q"))` |
| `makeLocation` | `(path, params?, query?) => Location` | constructs a `Location` |

## Quick Start

See [`example.ts`](./example.ts) for a runnable (browser-free) version. The
toolkit resolves a path to *data*; an app then maps that to a `Msg`/`Model`
under plgg-view's `application` runtime.

```typescript
import {
  compilePattern,
  matchSegments,
  parseQuery,
  makeLocation,
  param,
  query,
} from "plgg-router";
import { pipe, getOr, mapOption, isSome } from "plgg";

const userRoute = compilePattern("/users/:id");

// match a pathname → captured params (Option)
const matched = matchSegments(userRoute, "/users/42");
isSome(matched); // true

// fold params + query into a Location, then read them with param/query
const loc = makeLocation(
  "/users/42",
  { id: "42" },
  parseQuery("?tab=posts"),
);
pipe(loc, param("id"), getOr("?")); // "42"
pipe(loc, query("tab"), getOr("")); // "posts"
```

## Routing

- **Static** segments match verbatim: `/health`.
- **Params** capture one segment: `/users/:id` → `pipe(loc, param("id"))`.
- **Wildcards** capture the remainder: `/files/*` (named `*`) or `/files/*path`.
  A wildcard is effectively terminal; without one the part count must match
  exactly.
- **Query** is parsed from a search string into a `Dict`; read it with
  `pipe(loc, query("q"))`. Keys and values are percent-decoded, degrading to the
  raw token on malformed input.
- Path params are percent-decoded; malformed encodings fall back to the raw
  value. Compiled segments are a plgg `Box` union (`Static` / `Param` /
  `Wildcard`) — defined verbatim parallel to plgg-server.

To resolve a route table, scan compiled patterns in registration order and take
the first `matchSegments` success (first-match-wins, so register a `*` catch-all
last). [`example.ts`](./example.ts) shows the few lines this takes; an app
typically does it inside its `update`/`init` when mapping a `Url` to a route.

## Considerations

- **Dependency direction.** Peer experimental packages don't import each other's
  internals — only plgg core. That is why `Segment`/`compilePattern`/
  `matchSegments` are cloned from plgg-server (verbatim, parallel definition)
  rather than shared, and why this package no longer depends on plgg-view: the
  view/DOM concerns live entirely in plgg-view's `application` runtime, which
  *consumes* this pure toolkit. If drift becomes a problem, a follow-up can lift
  the shared path machinery into plgg core.
- **Zero third-party runtime deps.** No `history`, `path-to-regexp`, or `qs` —
  the path machinery and `parseQuery` are small and plgg-native.
- **Where the DOM/History loop went.** Link interception (`<a>` click guards),
  `popstate`, `pushState`, and the render loop now live in plgg-view's
  `application` runtime — routing folds into the Elm Architecture (the URL lives
  in the `Model`, navigation is a `Msg`). This package stays pure so it is
  trivially testable and reusable from both client and SSR code.
