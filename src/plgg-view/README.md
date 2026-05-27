# plgg-view

> **UNSTABLE / EXPERIMENTAL POC** - Study work. Part of the
> [plgg monorepo](../../README.md).

A client-side **presentation layer** — JSX-style declarative rendering,
Preact-like in spirit but built **functionally, from scratch, on the
[plgg](../plgg/) framework**. It is the view counterpart to the server stack
(`plgg-view` → `plgg-http-client` → `plgg-http-router`), and a dogfooding
exercise: the view is pure data (a plgg `Box` union), components are plain
functions, and rendering is one data-last `pipe`. No classes, no React/Preact
dependency — the only runtime dependency is `plgg`.

Scope is deliberately minimal: **static server-side rendering to a string**.
Reactivity, diffing, DOM mounting, event handling, and hooks are explicitly
**deferred** (see [Out of scope](#out-of-scope)).

## The plgg-native model

The whole view is pure data — a recursive `Box` union, never a class instance:

| Concern | Type |
|--------|------|
| element (tag + attrs + children) | `Box<"Element", { tag, props, children }>` |
| text (escaped at render) | `Box<"Text", { value: SoftStr }>` |
| fragment (no wrapper) | `Box<"Fragment", { children }>` |
| the node union | `VNode` |
| attributes | `Props` = `Dict<string, SoftStr>` |
| dropped prop / coerced value | `Option<SoftStr>` |

Platform types (the DOM) would appear **only at a future mounting seam**; this
POC has no such seam — its only output is an HTML string from `renderToString`.

## Quick start (hyperscript)

Components are plain functions `(props) => VNode`, composed by ordinary function
application and built with the `h` hyperscript. Rendering is a single data-last
step. See [`example.ts`](./example.ts) for a runnable version.

```typescript
import { h, fragment, renderToString, VNode } from "plgg-view";
import { SoftStr, pipe } from "plgg";

const Item = (label: SoftStr): VNode => h("li", null, label);

const List = (props: { items: ReadonlyArray<SoftStr> }): VNode =>
  h("ul", { class: "items" }, fragment(props.items.map(Item)));

const html = pipe(
  List({ items: ["a", "b & c", "<script>"] }),
  renderToString,
);
// <ul class="items"><li>a</li><li>b &amp; c</li><li>&lt;script&gt;</li></ul>
```

`h(tag, props, ...children)`:

- `props` is a `Props` map (string-valued attributes) or `null`.
- children are variadic and **normalized**: strings/finite numbers lift to
  `Text`, nested arrays flatten, and `false`/`null`/`undefined` drop out (so
  `cond && child` works).

## JSX

Set in this package's `tsconfig.json` so `.tsx` compiles against this package's
own hyperscript — no React, no Preact:

```jsonc
"jsx": "react-jsx",
"jsxImportSource": "plgg-view"
```

The automatic runtime then resolves `jsx` / `jsxs` / `Fragment` (and the `JSX`
namespace) from `plgg-view/jsx-runtime`, so JSX is just sugar over `h`:

```tsx
const Greeting = (props: { name: string }): VNode => (
  <p class="greet">Hello, {props.name}!</p>
);

renderToString(
  <main id="app">
    <Greeting name="Ada" />
    <ul>
      <li>one</li>
      <li>two</li>
    </ul>
  </main>,
);
```

At the JSX seam, prop values are coerced to attribute strings: strings pass
through, finite numbers stringify, `true` becomes a bare attribute (`disabled`)
and `false` is dropped; non-coercible values (functions, objects, `null`) drop.

## Rendering and XSS-safety

`renderToString(vnode): string` is a pure fold over the `VNode` union and the
single output seam. **Escaping is a correctness requirement, not optional:**

- `Text` content is escaped (`&`, `<`, `>`).
- attribute values are escaped, including quotes (`"`, `'`), so a value can
  never break out of its `"..."` and forge markup.
- attribute **names** are restricted to the HTML name grammar; an unsafe key is
  dropped rather than emitted.
- HTML void elements (`br`, `img`, `input`, …) self-close and never wrap
  children.

## Two layers

- **`Vnode`** — the model (`VNode`, `Props`, `element`/`text`/`fragment`,
  child/prop normalization) plus the builders (`h`, and the `jsx`/`jsxs`/
  `Fragment` runtime).
- **`Render`** — `renderToString` and the escaping primitives (`escapeText`,
  `escapeAttr`, `isSafeAttrName`).

## Run the example

```sh
cd src/plgg-view && npx tsx example.ts
```

(Run from the package directory so `tsx` picks up this package's `tsconfig.json`
path mapping for `plgg-view/index`.)

## Out of scope

Noted as **later**, intentionally not built in this POC: reactivity / signals /
state, diffing / reconciliation, DOM mounting, event handling, and hooks.

## Conventions

- Specs import from `"plgg-view/index"` (bare `"plgg-view"` resolves
  inconsistently under tsconfig `paths`), matching the `plgg-web` convention.
- `as` / `any` / `ts-ignore` are prohibited (see root `CLAUDE.md`); unknown
  inputs are narrowed with plgg type guards and `Option`.
- After editing `plgg` core, run `npm run build` in `src/plgg` or this package
  won't see new exports (the dependency is a symlinked `file:` dist).
