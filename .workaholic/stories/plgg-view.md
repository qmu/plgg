# plgg-view — a presentation layer for plgg (SSR + CSR), POC

## Overview

This branch adds a client-side **presentation layer** built functionally on
[plgg](../../src/plgg/), and wires it into the server stack so the same
components render on both server and client. It is an experimental POC; scope is
deliberately minimal and reactivity is out of scope.

Three things landed:

1. **`plgg-view`** — a small, Preact-like **JSX runtime on plgg**. It *processes*
   `.tsx` (via `jsxImportSource: "plgg-view"`) into a pure-data `VNode` tree (a
   plgg `Box` union). No classes, no React/Preact; the only runtime dependency
   is `plgg`. It emits no HTML and no DOM — the view is pure data.
2. **`plgg-web`** — gained a `View` feature that renders `plgg-view` components
   two ways: **SSR** (`VNode → HTML string`, behind `viewResponse`/`pageResponse`)
   and **CSR** (`VNode → DOM`, on the `plgg-web/client` subpath). Both walk the
   same tree via a shared neutral fold (`foldVNode`) added to `plgg-view`.
3. **`example`** — consolidated single examples package demonstrating a simple
   plgg-view gallery, server-side rendering, and client-side rendering (one
   shared `App`).

## What changed, by package

- **`src/plgg-view`** (new): `VNode` `Box` union (`Element`/`Text`/`Fragment`),
  `Component<P>`, the `jsx`/`jsxs`/`Fragment` automatic runtime + `JSX`
  namespace (`jsx-runtime` / `jsx-dev-runtime` subpath exports, multi-entry
  build), child/prop normalization, and `foldVNode` (a neutral catamorphism over
  the tree). Uses plgg primitives (`Num`/`Bool`, `isNum`/`isBool`); `null`/
  `undefined` appear only at the documented JSX child seam (plgg models absence
  as `Option`).
- **`src/plgg-web`** (extended): new `View` feature — `renderToString` + XSS-safe
  escaping (SSR), `htmlDocument`, `viewResponse`/`pageResponse`/`javascriptResponse`,
  and client `render(VNode, container)` on the `plgg-web/client` subpath (kept
  off the server graph; verified free of `node:*`). Depends on `plgg-view`;
  multi-entry build (`index` + `client`).
- **`src/example`** (consolidated): `view/` (plgg-view gallery), shared `App.tsx`,
  `ssr/server.ts` (SSR + serves the client bundle), `csr/client.tsx` (CSR; the
  nullable `#root` is lifted via `fromNullable`/`Option`), plus the existing
  plgg `modeling/` example. Replaces the short-lived `example-view` and
  `example-ssr` packages.
- **`sh/`**: per-package scripts for plgg-view; build order fixed (plgg-view
  before plgg-web); `npm-install`/`check-all` updated (consumers run after
  `build.sh`).

## Key decisions

- **plgg-view stays pure data.** It is the JSX runtime, not an HTML/DOM builder.
  The HTML serialization (SSR) and DOM construction (CSR) live in the web layer
  (`plgg-web`), both consuming the `VNode` tree. A single shared `foldVNode`
  expresses "walk the tree" once; SSR instantiates it with `R = string`, CSR with
  `R = Node`.
- **Follow plgg idioms.** Native `number`/`boolean` became `Num`/`Bool` with
  plgg guards; absence is `Option`, not bespoke null types. No `as`/`any`/
  `ts-ignore` anywhere.
- **One examples package.** Examples belong in the existing `example` package,
  not in a proliferation of `example-*` directories.

## Outcome

- `tsc` clean across all packages.
- Tests green: plgg-view 15 (100% coverage), plgg-web 101 (coverage ≥96%),
  example 7 (plgg-view gallery + SSR/CSR isomorphism).
- Library builds emit their entries (`plgg-view`: index + jsx-runtime +
  jsx-dev-runtime; `plgg-web`: index + client).
- The isomorphic demo verified end-to-end: `curl /` returns the SSR document
  (markup in `#root` + the client `<script>`), `curl /client.js` serves the
  bundle as `text/javascript`, and the built `client.js` mounts the full `App`
  into `#root` in a DOM.

## Concerns / follow-ups

- **DOM mounting beyond first render is deferred** — no reactivity, state, hooks,
  diffing, or hydration. The `VNode` tree is exactly what a future renderer would
  consume.
- **`null`/`undefined` in the foundation** — a deeper "model absence as `Option`
  everywhere" discussion was started and deferred; the `Child` seam keeps native
  nullish only because JSX emits it. Worth revisiting in plgg core.
- **Cross-branch coordination** — `plgg-web` is *not* renamed here; the
  `plgg-web → plgg-http-router` rename is in-flight on the `plgg-http-client`
  branch and will reconcile on merge.

## Patterns worth keeping

- Catamorphism (`foldVNode`) as the single tree traversal shared by every
  renderer — neutral to the output type.
- Subpath exports + multi-entry builds to separate server and browser graphs
  (`plgg-web/client`, `plgg-view/jsx-runtime`), mirrored from the existing
  package conventions.
- Real-consumer examples: the example package imports the published package
  surface (`plgg-view`, `plgg-web`, `plgg-web/client`), exactly as an external
  app would.
