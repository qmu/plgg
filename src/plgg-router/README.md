# plgg-router

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

A lightweight SPA **client-side** router built **from scratch on the
[plgg](../plgg/) framework** and [plgg-view](../plgg-view/). A router here is a
function from a `Location` to a `VNode`, plus a thin History-API seam that turns
`<a>` clicks and `popstate` events into re-renders. The only runtime
dependencies are `plgg` and `plgg-view`.

## Naming: `plgg-router` vs. plgg-server's `Routing`

The word "router" has history in this repo (`plgg-web → plgg-http-router →
plgg-server`), so to be unambiguous:

- **plgg-server's `Routing`** is *server-side*: it matches an incoming request
  path to an `HttpResponse` (`Location`-free, method-aware, `Result`/`HttpError`).
- **plgg-router** is *client-side*: it matches the browser's current `Location`
  to a `VNode` (no HTTP methods, no `Result` — a route is a pure, synchronous
  `Location -> VNode`).

The two share the same path vocabulary — `Segment`, `:param`, `*wildcard` — **by
parallel definition, not by import**: peer experimental packages don't depend on
each other (see [Considerations](#considerations)), so the ~150 lines of pure
path machinery are cloned rather than coupled. A reader of both packages sees
the same words mean the same things.

## The plgg-native model

| Concern | Type |
|--------|------|
| string values (path, params, query) | `SoftStr` |
| param / query maps | `Dict<string, SoftStr>` |
| compiled path segment | `Segment` = `Box<"Static" \| "Param" \| "Wildcard", SoftStr>` |
| current location | `Location` = `{ path, params, query }` (pure data) |
| route handler | `Handler` = `(loc: Location) => VNode` |
| a route | `Route` = `{ pattern, segments, handler }` (no `method`) |
| the router | `Router` = `{ routes }` (pure data, no methods) |
| lookups | `Option<SoftStr>` |
| resolution | `resolve(router, loc)` → `Option<VNode>` |

Lookups are `Option`, never raw strings; the router is **pure, immutable data**
built by composing data-last `Router => Router` transformers through `pipe`.

## Two entry points

The package is split so its **core import is environment-agnostic**:

- **`plgg-router`** (core) — the `Router` model and the pure usecases
  (`compilePattern`, `matchSegments`, `parseQuery`, `resolve`, `param`,
  `query`). No `window`/`history`/`document` — safe to import anywhere,
  including under SSR/Node.
- **`plgg-router/client`** (DOM/History seam) — `start`, `push`, `replace`,
  `currentLocation`, `makeLocation`. The only code that touches browser
  globals.

## Quick Start

The router is built the plgg way — a `pipe` of data-last `Router => Router`
transformers, mirroring plgg-server's `Web` builder exactly minus everything
HTTP-specific. See [`example.ts`](./example.ts) for a runnable (browser-free)
version.

```tsx
import { router, get, route, param } from "plgg-router";
import { start } from "plgg-router/client";
import { render } from "plgg-server/client"; // the host injects the DOM renderer
import { pipe, getOr } from "plgg";

const app = pipe(
  router(),
  get("/", () => <h1>Home</h1>),
  get("/users/:id", (loc) => (
    <h1>User {pipe(loc, param("id"), getOr("?"))}</h1>
  )),
  get("*", () => <h1>Not Found</h1>), // first-match-wins → wildcard last
);

const root = document.getElementById("root");
if (root) {
  // `render` is provided by the host (plgg-server/client), never imported by
  // plgg-router — see Considerations (dependency direction).
  const stop = start(app, root, { render });
  // ... call `stop()` to tear down all listeners.
}
```

## Resolving a route (no DOM)

`resolve` is the pure core — ideal for unit tests and SSR. It scans routes in
registration order, folds the captured params into the `Location`, and returns
the first match's `VNode`:

```typescript
import { router, get, resolve, makeLocation, param } from "plgg-router";
import { pipe, isSome, getOr } from "plgg";

const app = pipe(router(), get("/users/:id", (loc) =>
  /* build a VNode from */ pipe(loc, param("id"), getOr("?")) as never));

const view = resolve(app, makeLocation("/users/42"));
// view: Option<VNode> — Some when a route matched, None otherwise.
isSome(view);
```

## Routing

- **Static** segments match verbatim: `/health`.
- **Params** capture one segment: `/users/:id` → `pipe(loc, param("id"))`.
- **Wildcards** capture the remainder: `/files/*` (named `*`) or `/files/*path`.
- **Query** is parsed from `window.location.search` into a `Dict`; read it with
  `pipe(loc, query("q"))`. Keys and values are percent-decoded, degrading to the
  raw token on malformed input.
- Path params are percent-decoded; malformed encodings fall back to the raw
  value. Compiled segments are a plgg `Box` union (`Static` / `Param` /
  `Wildcard`) — defined verbatim parallel to plgg-server.

Route builders: `get(path, handler)` (alias of `on`), `route(basePath, sub)` to
mount a sub-router under a prefix. Each is a data-last `Router => Router`
transformer you drop into a `pipe`; none mutate. **First registered match wins**
at `resolve` time, so register the `*` catch-all last.

## The DOM/History seam (`plgg-router/client`)

| Function | Description |
|--------|-------------|
| `start(router, container, { render, notFound? })` | renders the current route, subscribes to `popstate` + programmatic nav + intercepted `<a>` clicks, and returns a cleanup function that removes every listener. `render` is host-provided; `notFound` defaults to a "Not Found" text node. |
| `push(path)` | pushes a history entry, scrolls to top, re-renders. No-op for non-`http(s)` URLs. |
| `replace(path)` | replaces the current entry (no back-stack entry), re-renders. Same no-op guard. |
| `currentLocation()` | reads `window.location` into a `Location` (path + parsed query, empty params). |
| `makeLocation(path, params?, query?)` | constructs a `Location`. |

### Link interception preserves browser defaults

`start` only hijacks a click when it is a plain, left-button, unmodified click on
a same-origin `http(s)` `<a>`. It **preserves the browser default** for:
modifier-clicks (`Ctrl`/`Cmd`/`Shift`/`Alt`), non-left-button clicks,
already-prevented events, anchors with `target` / `download` / `rel="external"`
(or `noopener`/`noreferrer`), cross-origin hrefs, and non-`http(s)` schemes
(`mailto:`/`tel:`/`javascript:`/`data:`). This keeps the accessibility and
security semantics of real links intact. History API only — no hash routing.

### Decisions and deferrals (v1)

- **`render` is injected by the host**, not imported. plgg-router never depends
  on `plgg-server/client` (dependency direction); a host wires
  `start(router, root, { render })` with `render` from `plgg-server/client`.
- **Scroll**: `push` scrolls to top (browser default for a clicked link);
  `popstate` leaves scroll to the browser's restoration.
- **`document.title`** updates are the host's responsibility (a `VNode` can't
  express `<title>`).
- **Deferred to follow-ups**: hash routing, navigation guards / middleware,
  lazy/async routes, nested layout `<Outlet>`s, SSR-router handoff (matching the
  server-resolved route on first paint without a re-fetch), focus management /
  `aria-live` route announcements, and lifting `Segment`/matcher into plgg core.
  These are intentional omissions, not missed requirements.

## Considerations

- **Dependency direction.** Peer experimental packages don't import each other's
  internals — only plgg core and immediate dependencies (here: plgg +
  plgg-view). That is why `Segment`/`compilePattern`/`matchSegments` are cloned
  from plgg-server (verbatim, parallel definition) and why the DOM `render` is
  injected via `start`'s options rather than imported. If drift becomes a
  problem, a follow-up can lift the shared path machinery and the
  `render(VNode, Element)` signature into plgg core.
- **Zero third-party runtime deps.** No `history`, `path-to-regexp`, or `qs` —
  the path machinery and `parseQuery` are small and plgg-native.
- **Tests can't drive real navigation.** happy-dom's `pushState`/`replaceState`
  mutate `window.location` but do not navigate; the specs verify History-API
  state changes and listener wiring, which is what the contract promises.
