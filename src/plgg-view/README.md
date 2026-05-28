# plgg-view

> **UNSTABLE / EXPERIMENTAL POC** - Study work. Part of the
> [plgg monorepo](../../README.md).

A small, **Preact-like, component-oriented JSX runtime** built **from scratch on
[plgg](../plgg/)**. It is the library a `.tsx` file is processed *through*: set
`jsxImportSource: "plgg-view"` and the compiler emits `jsx`/`jsxs`/`Fragment`
calls into this package, which turn your function components into a **pure-data
plgg view tree**. No React/Preact dependency — the only runtime dependency is
`plgg`.

It is intentionally a **subset** of JSX/TSX, and it is **not** an HTML or DOM
builder. There is no `renderToString`, no `h` hyperscript, no manual element
builders — you write `.tsx`, and the result is a `VNode` value.

## What it is (and isn't)

| | |
|--|--|
| ✅ processes `.tsx` (the JSX automatic runtime) | ❌ no HTML string output |
| ✅ function components `(props) => VNode` | ❌ no DOM building / mounting (deferred) |
| ✅ the view as pure plgg data (`VNode` `Box` union) | ❌ no `h` / `fragment` / `element` builders |
| ✅ fragments, props, children, list/conditional | ❌ no reactivity / state / hooks / diffing |

## The view tree

Processing a component yields a plgg `Box` union — pure data, never a class
instance or a DOM node:

| Node | Type |
|------|------|
| intrinsic element | `Box<"Element", { tag, props, children }>` |
| text leaf | `Box<"Text", { value: SoftStr }>` |
| fragment (no wrapper) | `Box<"Fragment", { children }>` |
| the union | `VNode` |
| attributes | `Props` = `Dict<string, SoftStr>` |

Function components are **resolved away** into this tree as it is built (eager,
since this POC has no re-render), so a `VNode` only ever describes host
structure.

## Usage

Point the compiler at this runtime (already set in this package's
`tsconfig.json`, and what a consumer sets too):

```jsonc
"jsx": "react-jsx",
"jsxImportSource": "plgg-view"
```

Then write `.tsx` — no imports needed for JSX itself; bring in `VNode` (and
`Component`) to type your components:

```tsx
import { VNode } from "plgg-view";

const Item = (props: { label: string }): VNode => (
  <li class="item">{props.label}</li>
);

const List = (props: { items: ReadonlyArray<string> }): VNode => (
  <ul class="list">
    {props.items.map((label) => (
      <Item label={label} />
    ))}
  </ul>
);

// `view` is a plgg VNode tree — the processed result of the .tsx above.
const view: VNode = <List items={["a", "b"]} />;
```

`view` is:

```jsonc
{ "__tag": "Element", "content": {
  "tag": "ul", "props": { "class": "list" }, "children": [
    { "__tag": "Element", "content": { "tag": "li", "props": { "class": "item" },
      "children": [ { "__tag": "Text", "content": { "value": "a" } } ] } },
    { "__tag": "Element", "content": { "tag": "li", "props": { "class": "item" },
      "children": [ { "__tag": "Text", "content": { "value": "b" } } ] } }
  ] } }
```

At the JSX seam, prop values are coerced to attribute strings: strings pass
through, finite numbers stringify, `true` becomes a bare attribute and `false`
drops; non-coercible values (functions, objects, `null`) drop. Children are
normalized: primitives lift to `Text`, arrays flatten, `false`/`null`/
`undefined` drop (so `cond && <x/>` works).

## Public surface

- The JSX runtime: `plgg-view/jsx-runtime` (`jsx`, `jsxs`, `Fragment`, and the
  `JSX` namespace) and `plgg-view/jsx-dev-runtime` — resolved by the compiler,
  not called by hand.
- Types: `VNode`, `Component<P>`, `Props`, `Child`, plus the `isVNode` guard.

## Run the example

```sh
cd src/plgg-view && npx tsx example.tsx
```

Writes a small component tree and prints the resulting `VNode` as JSON. A fuller
consumer example lives in [`../example-view`](../example-view/).

## Deferred (out of scope for this POC)

A renderer that walks the `VNode` tree into the **live DOM** (mounting), plus
reactivity / state / hooks / diffing. The pure-data tree this library produces
is exactly what such a renderer would consume.

## Conventions

- Specs import from `"plgg-view/index"` (bare `"plgg-view"` resolves
  inconsistently under tsconfig `paths`), matching the `plgg-server` convention.
- `as` / `any` / `ts-ignore` are prohibited (see root `CLAUDE.md`); unknown
  inputs are narrowed with plgg type guards and `Option`.
- After editing `plgg` core, run `npm run build` in `src/plgg` or this package
  won't see new exports (the dependency is a symlinked `file:` dist).
