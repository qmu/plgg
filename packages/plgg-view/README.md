# plgg-view

> **UNSTABLE / EXPERIMENTAL POC** - Study work. Part of the
> [plgg monorepo](../../README.md).

A **minimal Elm Architecture (TEA)** built **from scratch on [plgg](../plgg/)**.
An app is three pure values — an immutable `Model`, an `update: (Msg, Model) =>
Model`, and a `view: (Model) => Html<Msg>` — driven by a tiny runtime. State is
one value, every change flows through `update` as data (`Msg`), and the view is
a pure function of the model. It fits plgg's ethos exactly: pure functions,
immutable data, events as values, one runtime seam. The only runtime dependency
is `plgg`.

This is the **minimum** that is still recognizably TEA: `sandbox`/`application`
over an in-place **diff/patch renderer**, **no `Cmd`/`Sub`**. Effects (HTTP,
timers, programmatic navigation) are a deliberate non-goal of this minimum.

## What it is (and isn't)

| | |
|--|--|
| ✅ `Model` / `Msg` / pure `update` / pure `view` | ❌ no `Cmd` / `Sub` / effects |
| ✅ a typed `Html<Msg>` view tree (handlers produce `Msg`) | ❌ no JSX (Elm-style element builder functions instead) |
| ✅ `sandbox` + `application` (routing-aware) runtimes | ❌ no keyed-list reconcile or render batching (follow-ups) |
| ✅ virtual-DOM diff/patch — re-renders preserve focus/caret | ❌ no hydration (mount re-renders from `init`) |
| ✅ declarative enter/exit transitions (WAAPI, `prefers-reduced-motion`-aware) | ❌ no spring physics, keyed-FLIP reorder, or exit-while-list-churns (follow-ups) |
| ✅ pure SSR `renderToString(Html)` | |

## The view tree — `Html<Msg, T>`

A plgg `Box` union — pure data, never a class instance or DOM node —
parameterized by the app's `Msg` and the element's tag `T`:

| Node | Type |
|------|------|
| intrinsic element | `Box<"Element", { tag, attributes, children }>` |
| text leaf | `Box<"Text", { value: SoftStr }>` |
| the union | `Html<Msg, T>` (`T` defaults to `string`) |
| an attribute | `Attribute<Msg>` = a static `attr` **or** an event `Handler` producing `Msg` |

The **handler channel** on `Attribute<Msg>` is what makes the tree `Html<Msg>`
rather than a passive string tree. Build it with Elm-style element builder
functions:

- elements: `el(tag, attrs, children)` and helpers `div`/`button`/`input`/`ul`/
  `li`/`a`/`span`/`h1`/`p`/`form`/`main_`/… , plus `text(value)`.
- static attributes: `attr(name, value)` and helpers `class_`/`href`/`type_`/
  `value_`/`name_`.
- event handlers: `on(event, toMsg)` and helpers `onClick(msg)`,
  `onInput((value) => msg)`, `onChange(...)`, `onSubmit(msg)`.
- transitions: `transition({ enter, exit })` and presets `fadeIn(ms)`/
  `fadeOut(ms)`/`slideIn(offset, ms)` — pure `Anim` data (no `Msg`), so they drop
  into any attribute list. SSR drops them; the client renderer plays the enter
  motion on node creation and defers a node's removal until its exit motion ends,
  via the Web Animations API and honouring `prefers-reduced-motion`. The Model
  never learns animation exists, so the "no `Cmd`/`Sub`" boundary holds. A node
  mid-exit still occupies its child slot, so rapid list churn can collide — the
  outroing-set + keyed-FLIP fix is a follow-up.

`Html<Msg>` is a **functor over `Msg`**: `mapHtml(f)(html)` lets a parent embed a
child component's view (Elm's `Html.map`).

## Typed content model — `T` restricts children

The second type parameter `T` brands an element's tag *at the type level* (the
tag is already stored as data, so the brand is real — no cast). Each builder
declares **what it is** (its branded return type) and **what it accepts** (its
children parameter), so illegal structure is a compile error, not a runtime bug:

```ts
ul([], [li([], [text("a")])]);   // ✅
ul([], [div([], [])]);           // ❌ "div" is not assignable to "li"
span([], [ul([], [])]);          // ❌ ul is flow, not phrasing
input([type_("text")], []);      // ✅ void: children must be `readonly []`
```

The categories are small tag-unions, applied **selectively** (not a full HTML
content-model lattice — see *type-driven-design*, "introduce rich typing where
confusion can occur, not over every value"):

| Category | Tags | Containers that accept it |
|----------|------|----------------------------|
| `Phrasing<Msg>` | inline: `span`/`a`/`strong`/`em`/`label`/`button`/`input`/text | `span`/`strong`/`em`/`label`/`button`/`h1`/`h2`/`p` |
| `Flow<Msg>` | block ∪ phrasing (excludes `li`) | `div`/`section`/`header`/`main_`/`form`/`li`/`a` |
| `ListItem<Msg>` | `li` only | `ul` |
| `readonly []` | none (void) | `input` |

**Restriction is producer-side.** Unlike React/TSX — where each container must
remember to constrain its own `children` prop and an intrinsic `<li>` collapses
to `ReactNode` — here a value's *own type* says `Html<Msg, "li">`, so every
container that accepts `li` enforces it automatically. A custom component opts
into a strict slot by simply declaring what it is:

```ts
// declares it IS an <li>, so it drops into ul's li-only slot:
const todoItem = (t: Todo): Html<Msg, "li"> =>
  li([class_("todo")], [text(t.title)]);

ul([], todos.map(todoItem));     // ✅
```

A component left as the bare `Html<Msg>` (i.e. `Html<Msg, string>`) is **rejected
by default** from strict slots — you must positively declare the tag. That
"opt-in to strictness" is the safer default.

**Cardinality** is the second, independent axis — set by the children *shape*:

| Want | Children type |
|------|---------------|
| exactly one `B` | a single value `Html<Msg, "b">` (or `One<Msg, "b">` in array form) |
| fixed/ordered `[B, C]` | `readonly [Html<Msg, "b">, Html<Msg, "c">]` |
| one or more `B` | `NonEmpty<Msg, "b">` |
| zero (void) | `readonly []` |
| zero or more | `ReadonlyArray<Flow<Msg>>` (the default array form) |

### `el` is the escape hatch — and its honest limit

`el(tag, attrs, children)` stays permissive: any children, tag branded only as
`string`. Because the brand is *honest* (it equals the real runtime tag, and `el`
takes a dynamic tag), an `el(...)` node is `Html<Msg, string>` and therefore does
**not** fit a typed builder's child slot — there is no cast to fake a category.
The mental model is **typed islands vs. escape-hatch islands**: a raw `el` child
does not interleave into a typed parent; build the whole untyped subtree with
`el` (its parent included). Use `el` for tags the model does not cover (`<b>`,
`<img>`, tables/selects) or transparency cases (`<a>`'s content depends on its
parent — left unmodeled). Likewise `mapHtml` rebuilds nodes at the default brand,
so a mapped child is `Html<Msg, string>` and won't re-enter a strict slot.

## The runtimes (browser seam — `plgg-view/client`)

```ts
import { sandbox, application } from "plgg-view/client";

// sandbox: the purest TEA — no routing
const stop = sandbox({ init, update, view })(container); // → cleanup

// application: routing-aware (Browser.application-style, still no Cmd)
const stop = application({ init, update, view, onUrlChange })(container);
```

- **`sandbox`** holds the live `Model` in a closure (the single justified mutable
  seam — Elm's runtime is imperative here too). A `dispatch(msg)` sets
  `model = update(msg, model)` and re-renders by **diffing** the new `Html<Msg>`
  against the last and patching only what changed (`makeRenderer`), so a re-render
  is O(changes) and a focused input keeps its focus, caret, and IME state. Event
  listeners are wired once per node and re-pointed in place — never duplicated,
  never stale (the live handler is read on each event from a per-node registry).
- **`application`** additionally owns the URL: it reads the entry `Url` into
  `init`, intercepts same-origin in-app `<a>` clicks (preserving browser defaults
  for modifier-clicks, `target`/`download`/pass-through `rel`, cross-origin and
  non-`http(s)` links), `pushState`s, and turns navigation + `popstate` into
  `onUrlChange(url): Msg`. The app maps `Url { path, search }` to its own route
  value using plgg-router's pure `compilePattern`/`matchSegments`/`parseQuery`,
  so navigation is just data flowing through `update`. Programmatic push is a
  non-goal of this minimum (it needs an effect seam).

Both are shipped on the `plgg-view/client` subpath so `window`/DOM code never
reaches the SSR-safe core entry.

## SSR — `renderToString` (core, SSR-safe)

```ts
import { renderToString } from "plgg-view";

renderToString(view(init)); // Html<Msg> → escaped HTML string; handlers dropped
```

A pure `Html<Msg> => SoftStr` fold (text + attribute values escaped, unsafe
attribute names dropped, void elements self-closing). Event handlers are dropped
— there are no events on the server. The server renders `view(init)` for first
paint; the client runtime then takes over (the minimum re-renders from `init` on
mount — true hydration is a follow-up). plgg-server's `View` is a thin wrapper
over this.

## Two entry points

- **`plgg-view`** (core) — the `Html<Msg>`/`Attribute<Msg>` model, the builders,
  `foldHtml`, `mapHtml`, and the pure SSR `renderToString`/`escape`. No DOM —
  SSR-safe, importable anywhere.
- **`plgg-view/client`** (browser seam) — `sandbox`, `application`, `makeRenderer`
  (the diffing Html→DOM renderer), and the `Url` model. The only code that touches
  browser globals.

## Run the example

```sh
cd packages/plgg-view && npx tsx example.ts   # type-checks; the demo mounts in a browser
```

[`example.ts`](./example.ts) is a TEA counter (`Model`/`Msg`/pure `update`/`view`
over `sandbox`). A fuller client-only TEA To-Do app lives in
[`../example`](../example/).

## Conventions

- Specs import from `"plgg-view"` / `"plgg-view/client"`; internal modules use
  the `"plgg-view/…"` path alias, matching the `plgg-server` convention.
- `as` / `any` / `ts-ignore` are prohibited (see root `CLAUDE.md`); unknown
  inputs are narrowed with plgg type guards and `Option`. The runtime's mutable
  model ref and the renderer's previous-tree ref / DOM mutation are the justified
  imperative seams (confined to `sandbox`/`application`/`render`, commented).
- After editing `plgg` core, run `npm run build` in `packages/plgg` or this package
  won't see new exports (the dependency is a symlinked `file:` dist).
