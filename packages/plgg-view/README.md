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
| ✅ a typed `Html<Msg>` view tree (handlers produce `Msg`) | ❌ no JSX (Elm-style hyperscript builders instead) |
| ✅ `sandbox` + `application` (routing-aware) runtimes | ❌ no keyed-list reconcile or render batching (follow-ups) |
| ✅ virtual-DOM diff/patch — re-renders preserve focus/caret | ❌ no hydration (mount re-renders from `init`) |
| ✅ pure SSR `renderToString(Html)` | |

## The view tree — `Html<Msg>`

A plgg `Box` union — pure data, never a class instance or DOM node — parameterized
by the app's `Msg`:

| Node | Type |
|------|------|
| intrinsic element | `Box<"Element", { tag, attributes, children }>` |
| text leaf | `Box<"Text", { value: SoftStr }>` |
| the union | `Html<Msg>` |
| an attribute | `Attribute<Msg>` = a static `attr` **or** an event `Handler` producing `Msg` |

The **handler channel** on `Attribute<Msg>` is what makes the tree `Html<Msg>`
rather than a passive string tree. Build it with Elm-style hyperscript:

- elements: `el(tag, attrs, children)` and helpers `div`/`button`/`input`/`ul`/
  `li`/`a`/`span`/`h1`/`p`/`form`/`main_`/… , plus `text(value)`.
- static attributes: `attr(name, value)` and helpers `class_`/`href`/`type_`/
  `value_`/`name_`.
- event handlers: `on(event, toMsg)` and helpers `onClick(msg)`,
  `onInput((value) => msg)`, `onChange(...)`, `onSubmit(msg)`.

`Html<Msg>` is a **functor over `Msg`**: `mapHtml(f)(html)` lets a parent embed a
child component's view (Elm's `Html.map`).

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
