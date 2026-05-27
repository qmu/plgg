# @plgg/example-view

> Example client-side app built with **[plgg-view](../plgg-view/)**. Part of the
> [plgg monorepo](../../README.md).

A small to-do view that shows how to build client-side code with `plgg-view`
**as a real dependency** — it imports from the bare package `"plgg-view"` (and
uses JSX via `jsxImportSource: "plgg-view"`), exactly as an app outside this
repo would. It depends on `plgg-view` through `file:../plgg-view`, so it
consumes the package's built `dist` (run the build once — see below).

## What it demonstrates

| Concept | Where |
|--------|-------|
| Function components (`(props) => VNode`) | [`components/TodoItem.tsx`](./src/components/TodoItem.tsx) |
| Conditional + list rendering (`cond ? … : …`, `array.map`) | [`components/TodoList.tsx`](./src/components/TodoList.tsx) |
| Composition via JSX **children** (a generic shell) | [`components/Layout.tsx`](./src/components/Layout.tsx) |
| Wiring it all into a page | [`App.tsx`](./src/App.tsx) |
| Rendering to HTML (the data-last `pipe`) | [`render.ts`](./src/render.ts) |
| **Client-side** mount into the DOM | [`mount.tsx`](./src/mount.tsx) |
| Running it in Node to see the output | [`demo.ts`](./src/demo.ts) |

Every component imports its types and the renderer from the package:

```tsx
import { VNode, renderToString } from "plgg-view";
```

and JSX (`<li class="todo">…</li>`) resolves to `plgg-view/jsx-runtime` because
`tsconfig.json` sets `"jsx": "react-jsx"` and `"jsxImportSource": "plgg-view"` —
no React, no Preact.

## Client-side rendering

`plgg-view` is static SSR-to-string in this POC (DOM mounting is deferred), so
on the client you render the tree to HTML once and hand it to the DOM:

```tsx
// mount.tsx
import { renderApp } from "./render";

const root = document.getElementById("app-root");
if (root !== null) {
  root.innerHTML = renderApp(); // App() -> VNode -> escaped HTML
}
```

Pair it with a page that has `<div id="app-root"></div>` and load the bundled
module (`vite build`) with `<script type="module">`.

## Try it

```sh
# 1. build the library this example depends on (once, from the repo root)
cd src/plgg-view && npm run build

# 2. install + run the demo
cd ../example-view && npm install
npx tsx src/demo.ts        # prints the rendered HTML
npm test                   # tsc + vitest
```
