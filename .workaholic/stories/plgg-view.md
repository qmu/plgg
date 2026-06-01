# plgg-view — a presentation layer for plgg (SSR + CSR), POC

> **Note (2026-06):** The sections below describe the original **JSX/VNode**
> iteration (and the since-renamed `plgg-web`). plgg-view has since been rebuilt
> as a minimal **Elm Architecture** with a pure `Html<Msg>` tree (no JSX). For
> the current authoritative design of the typed content-model feature, see
> **"Typed content model — child & arity constraints"** at the end of this file.

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

---

## Typed content model — child & arity constraints (2026-06)

### The idea

Give the `Html` view tree a **type-level content model**: illegal child
structure becomes a compile error instead of a runtime bug. `Html` gains a
second type parameter, `Html<Msg, T>`, where `T` brands the element's tag. The
tag is *already stored as data*, so the brand is real — there is **no cast**
anywhere (the house no-escape-hatch rule holds). Each builder declares **what it
is** (branded return type) and **what it accepts** (children parameter typed by
content category and/or cardinality). The runtime payload is unchanged, so the
diff/patch renderer, `foldHtml`, `mapHtml`, and `renderToString` keep treating
children uniformly as `ReadonlyArray<Html<Msg>>`.

Two independent axes:

- **Which children** — element type. `ul` accepts only `li`; `span` accepts only
  phrasing; categories are small tag-unions (`Phrasing`, `Flow`, `ListItem`).
- **How many** — cardinality. Exactly-one via a single-value parameter,
  fixed/ordered arity via tuples, non-empty via a head+rest tuple, void via the
  empty tuple `readonly []`, unbounded via the array form.

### Why this is the difference from JSX/TSX

Restriction is **producer-side**. In React/TSX each container must remember to
constrain its own `children` prop, and an intrinsic `<li>` collapses to
`ReactNode` (untagged, arity-blind). Here a value's *own type* says
`Html<Msg, "li">`, so every container that accepts `li` enforces it
automatically, and a custom component opts into a strict slot by declaring what
it is (`viewTodo: Html<Msg, "li">`). A bare `Html<Msg>` is rejected from strict
slots by default — opt-in strictness.

### Policy lens (`standards:implementation`)

This is *type-driven-design* made concrete — "the compiler is AI's most accurate
and cheapest feedback path." It moves a class of structural correctness onto the
type, which matters doubly for an agent whose inner loop is edit → `tsc` → fix:
fewer plausible-but-wrong constructions survive, and the rule surfaces at the
exact call site. The same policy's **paired constraint** bounds the design: rich
typing is applied **selectively** (a handful of category unions, not a full HTML
content-model lattice) and kept **within a readable range** — no multi-stage
conditional-type towers, no mass-produced near-duplicate per-tag types. When a
constraint would strain (transparency, tables), we leave it to the `el` escape
hatch rather than widen or fake it.

### Honest limits (documented, not chased)

- **`el` is string-branded**, so an escape-hatch node does not fit a typed slot
  (honest branding admits no cast). Mental model: *typed islands vs.
  escape-hatch islands* — a raw `el` child does not interleave into a typed
  parent; build the untyped subtree (parent included) with `el`.
- **Transparency** (`<a>` content depends on parent) is unmodeled; `a` is a flow
  container by approximation.
- **`mapHtml` rebuilds at the default brand**, so a mapped child is
  `Html<Msg, string>` and won't re-enter a strict slot.
- Tags without a typed builder yet (`table`/`tr`/`td`, `select`/`option`, `dl`)
  are future, additive work; use `el` meanwhile.

### Where it landed

- `Html.ts` — `Html<Msg, T = string>` + `ElementContent<Msg, T = string>`.
- `element.ts` — `Phrasing`/`Flow`/`ListItem` categories, `One`/`NonEmpty`
  cardinality aliases, four pinned cast-free factories
  (`flowEl`/`phrasingEl`/`listEl`/`voidEl`), retyped builders, permissive `el`.
- `element.spec.ts` — runtime coverage + type-level assertions (negatives proven
  as positive booleans, since `@ts-expect-error` is banned).
- `packages/plgg-view/README.md` — user-facing reference.
- Consumers: `packages/example` (`viewTodo` now declares `Html<Msg, "li">`),
  `plgg-server` SSR spec (escape-hatch nesting made contiguous).
