# plgg-view

A **complete Elm Architecture (TEA)**, built from scratch
on [plgg](/packages/plgg/). An app is pure values — an
immutable `Model`, an `update: (Msg, Model) => [Model,
Cmd<Msg>]`, a `view: (Model) => Html<Msg>`, and an
optional `subscriptions: (Model) => Sub<Msg>` — driven by
a tiny runtime. State is one value, every change flows
through `update` as a [`Msg`](/concepts/tagged-data), and
the view is a pure function of the model. Its only runtime
dependency is `plgg`.

`sandbox`/`application` run over an in-place diff/patch
renderer and carry `Cmd`/`Sub` **effects** (D2): HTTP,
timers, or a WebSocket via a custom subscription are pure
DATA the app returns and the runtime alone executes — so
purity holds even with effects.

## Writing an app with it

Three pure values — `init`, `update`, `view` — handed to
a runtime. State is one immutable `Model`, every change
is a [`Msg`](/concepts/tagged-data) flowing through
`update`, and the view is Elm-style builders whose
handlers produce that `Msg`:

```typescript
import {
  div,
  h1,
  button,
  text,
  onClick,
} from "plgg-view";
import type { Html } from "plgg-view";
import { sandbox } from "plgg-view/client";

type Model = Readonly<{ count: number }>;
type Msg = "Inc" | "Dec";

const init: Model = { count: 0 };

const update = (msg: Msg, m: Model): Model =>
  msg === "Inc"
    ? { count: m.count + 1 }
    : { count: m.count - 1 };

const view = (m: Model): Html<Msg> =>
  div([], [
    h1([], [text(`count: ${m.count}`)]),
    button([onClick("Dec")], [text("-")]),
    button([onClick("Inc")], [text("+")]),
  ]);

// the runtime diff/patches on each dispatch
const stop = sandbox({ init, update, view })(
  document.body,
);
```

The same `view(init)` renders on the server via
[`renderToString`](#ssr-—-rendertostring) for first paint —
it is pure `Html<Msg>` data either way.

## Vocabulary

The library is a small set of Elm-style terms, grouped
by concern:

- **the tree** — `Html<Msg, T>`, a plgg
  [`Box`](/concepts/tagged-data) union of `Element` /
  `Text` / `Attribute` nodes; `mapHtml(f)` re-tags a
  child's `Msg` for a parent (Elm's `Html.map`).
- **elements** — `el(tag, attrs, children)` and helpers
  `div`/`button`/`input`/`ul`/`li`/`a`/`span`/`h1`/`p`/`form`/`main_`/…,
  plus `text(value)`.
- **static attrs** — `attr(name, value)` and helpers
  `class_`/`href`/`type_`/`value_`/`name_`.
- **handlers** — `on(event, toMsg)` and helpers
  `onClick(msg)`, `onInput((v) => msg)`, `onChange`,
  `onSubmit(msg)` — the channel that makes the tree
  `Html<Msg>` rather than a passive string.
- **transitions** — `transition({ enter, exit })` and
  presets `fadeIn`/`fadeOut`/`slideIn` — pure `Anim`
  data carrying no `Msg`.
- **runtimes** — `sandbox` and `application` (on the
  `plgg-view/client` subpath), plus the pure SSR fold
  `renderToString`.

## What it is (and isn't)

| ✅ | ❌ |
|----|----|
| `Model` / `Msg` / pure `update`→`[Model, Cmd]` / `view` / `subscriptions` | effects never RUN in `update` (returned as data) |
| typed `Html<Msg>` tree (handlers produce `Msg`) | no JSX (Elm-style builders instead) |
| `sandbox` + `application` runtimes | no keyed-list reconcile / batching |
| vDOM diff/patch — preserves focus/caret | **no hydration** (mount re-renders from `init`) |
| declarative WAAPI transitions | no spring physics / keyed-FLIP |
| pure SSR `renderToString` | |

## The view tree — `Html<Msg, T>`

A plgg `Box` union — pure data, never a class or DOM node
— parameterized by the app's `Msg` and the element tag
`T`:

| Node | Type |
|------|------|
| element | `Box<"Element", { tag, attributes, children }>` |
| text | `Box<"Text", { value: SoftStr }>` |
| attribute | `Attribute<Msg>` — a static `attr` **or** an event `Handler` producing `Msg` |

The **handler channel** is what makes the tree `Html<Msg>`
rather than a passive string tree. Build it with
Elm-style functions:

- **elements** — `el(tag, attrs, children)` and helpers
  `div`/`button`/`input`/`ul`/`li`/`a`/`span`/`h1`/`p`/`form`/`main_`/…,
  plus `text(value)`.
- **static attrs** — `attr(name, value)` and helpers
  `class_`/`href`/`type_`/`value_`/`name_`.
- **handlers** — `on(event, toMsg)` and helpers
  `onClick(msg)`, `onInput((v) => msg)`, `onChange`,
  `onSubmit(msg)`.

```typescript
import { div, h1, button, text, onClick } from "plgg-view";
import type { Html } from "plgg-view";

type Model = Readonly<{ count: number }>;
type Msg = "Inc" | "Dec";

const update = (msg: Msg, m: Model): Model =>
  msg === "Inc" ? { count: m.count + 1 } : { count: m.count - 1 };

const view = (m: Model): Html<Msg> =>
  div([], [
    h1([], [text(`count: ${m.count}`)]),
    button([onClick("Dec")], [text("-")]),
    button([onClick("Inc")], [text("+")]),
  ]);
```

`Html<Msg>` is a **functor over `Msg`**: `mapHtml(f)(html)`
lets a parent embed a child component's view (Elm's
`Html.map`).

## Typed content model — `T` restricts children

The second type parameter `T` brands an element's tag *at
the type level* (the tag is already stored as data, so
the brand is real — no cast). Each builder declares what
it **is** and what it **accepts**, so illegal structure
is a compile error, not a runtime bug:

```typescript
ul([], [li([], [text("a")])]); // ✅
ul([], [div([], [])]);         // ❌ "div" is not assignable to "li"
span([], [ul([], [])]);        // ❌ ul is flow, not phrasing
input([type_("text")], []);    // ✅ void: children must be readonly []
```

| Category | Tags | Accepted by |
|----------|------|-------------|
| `Phrasing<Msg>` | inline: `span`/`a`/`strong`/`em`/`label`/`button`/`input`/text | `span`/`strong`/`em`/`label`/`button`/`h1`/`h2`/`p` |
| `Flow<Msg>` | block ∪ phrasing (excludes `li`) | `div`/`section`/`header`/`main_`/`form`/`li`/`a` |
| `ListItem<Msg>` | `li` only | `ul` |
| `readonly []` | none (void) | `input` |

**Restriction is producer-side**: a value's own type says
`Html<Msg, "li">`, so every container that accepts `li`
enforces it automatically — a component left as the bare
`Html<Msg>` is rejected from strict slots by default
(opt-in to strictness). **Cardinality** is the
independent second axis, set by the children *shape*:
`One`/fixed-tuple/`NonEmpty`/`readonly []`/the default
array form.

`el(tag, attrs, children)` is the **escape hatch**: any
children, tag branded only as `string`. Because the brand
is honest, an `el(...)` node is `Html<Msg, string>` and
does **not** fit a typed builder's child slot (no cast to
fake a category) — build the whole untyped subtree with
`el`. Use it for unmodeled tags (`<img>`, tables, selects).

## Transitions

`transition({ enter, exit })` and presets
`fadeIn(ms)`/`fadeOut(ms)`/`slideIn(offset, ms)` are pure
`Anim` data carrying **no `Msg`**, so they drop into any
attribute list. SSR drops them; the client renderer plays
the enter motion on node creation and defers a node's
removal until its exit motion ends — via the Web
Animations API, honouring `prefers-reduced-motion`. The
`Model` never learns animation exists, so the "no
`Cmd`/`Sub`" boundary holds.

## SSR — `renderToString`

```typescript
import { renderToString } from "plgg-view";

renderToString(view(init)); // Html<Msg> → escaped HTML; handlers dropped
```

A pure `Html<Msg> => SoftStr` fold (text + attribute
values escaped, void elements self-closing). Event
handlers are dropped — there are no events on the server.
[plgg-server](/packages/plgg-server)'s View layer is a
thin wrapper over this.

::: warning No hydration (yet)
The minimum does **not** hydrate: the server renders
`view(init)` for first paint, and on mount the client
runtime re-renders from `init` rather than adopting the
server DOM. This shapes SSR/SSG expectations (first-paint
/ SEO / no-JS) and is a tracked follow-up.
:::

## The runtimes (`plgg-view/client`)

Both live on the `plgg-view/client` subpath, so
`window`/DOM code never reaches the SSR-safe core entry.

```typescript
import { sandbox, application } from "plgg-view/client";

const stop = sandbox({ init, update, view })(container);
const stop2 = application(
  { init, update, view, onUrlChange },
)(container);
```

- **`sandbox`** — the purest TEA (no routing). It holds
  the live `Model` in a closure (the one justified mutable
  seam); `dispatch(msg)` sets `model = update(msg, model)`
  and re-renders by **diffing** the new `Html<Msg>` against
  the last and patching only what changed, so a re-render
  is O(changes) and a focused input keeps focus, caret,
  and IME state.
- **`application`** — additionally owns the URL: reads the
  entry `Url` into `init`, intercepts same-origin in-app
  `<a>` clicks, `pushState`s, and turns navigation +
  `popstate` into `onUrlChange(url): Msg`. The app maps
  `Url { path, search }` to its route using
  [plgg-router](/packages/plgg-router)'s pure
  `compilePattern`/`matchSegments`/`parseQuery`, so
  navigation is just data flowing through `update`.

## Worked example

[`packages/example`](/packages/example) is the family's
TEA tutorial — a To-Do app whose one `Model`/`update`/`view`
program renders both server-side (SSR via plgg-server) and
client-side (CSR via `sandbox`).
