# @plgg/example-view

> Example app built with **[plgg-view](../plgg-view/)**. Part of the
> [plgg monorepo](../../README.md).

Shows how you write client-side UI as `.tsx` components with `plgg-view` **as a
real dependency** — it imports from the bare package `"plgg-view"` and compiles
JSX via `jsxImportSource: "plgg-view"`, exactly as an app outside this repo
would. It depends on `plgg-view` through `file:../plgg-view`, so it consumes the
package's built `dist` (build it once — see below).

`plgg-view` is the JSX runtime: it *processes* these `.tsx` components into a
pure-data plgg `VNode` tree. This POC stops there — there is no HTML output and
no DOM mounting (deferred) — so the demo prints the resulting tree.

## What it demonstrates

| Concept | Where |
|--------|-------|
| Function components (`(props) => VNode`) | [`components/TodoItem.tsx`](./src/components/TodoItem.tsx) |
| Conditional + list rendering (`cond ? … : …`, `array.map`) | [`components/TodoList.tsx`](./src/components/TodoList.tsx) |
| Composition via JSX **children** (a generic shell) | [`components/Layout.tsx`](./src/components/Layout.tsx) |
| Wiring it all into one view | [`App.tsx`](./src/App.tsx) |
| Consuming the view tree (collecting text) | [`App.spec.tsx`](./src/App.spec.tsx) |
| Seeing the processed tree | [`demo.ts`](./src/demo.ts) |

### A gallery of focused examples

The [`examples/`](./src/examples/) folder has one small component per capability
(see [`examples.spec.tsx`](./src/examples/examples.spec.tsx) for each one's
output):

| Example | Shows |
|--------|-------|
| [`Greeting`](./src/examples/Greeting.tsx) | a prop + text interpolated around a nested element |
| [`Badge`](./src/examples/Badge.tsx) | `Num`/`Bool` props coerced to attributes (stringify, bare-true, drop-false) |
| [`Card`](./src/examples/Card.tsx) | a generic wrapper that places `children` in a slot |
| [`Menu`](./src/examples/Menu.tsx) | a top-level fragment + list rendering with `.map` |
| [`Notice`](./src/examples/Notice.tsx) | conditional children (`? :` and `cond && <x/>`) |

Every component imports its types from the package:

```tsx
import { VNode } from "plgg-view";

export const TodoItem = (props: { todo: Todo }): VNode => (
  <li class={props.todo.done ? "todo done" : "todo"}>
    <span class="label">{props.todo.label}</span>
  </li>
);
```

and JSX (`<li class="todo">…</li>`) resolves to `plgg-view/jsx-runtime` because
`tsconfig.json` sets `"jsx": "react-jsx"` and `"jsxImportSource": "plgg-view"` —
no React, no Preact. `App()` returns the `VNode` tree those components compile
to; what you do with that tree (mount it, diff it, serialize it) is a separate,
future concern.

## Try it

```sh
# 1. build the library this example depends on (once, from the repo root)
cd src/plgg-view && npm run build

# 2. install + run the demo
cd ../example-view && npm install
npx tsx src/demo.ts        # prints the processed VNode tree as JSON
npm test                   # tsc + vitest
```
