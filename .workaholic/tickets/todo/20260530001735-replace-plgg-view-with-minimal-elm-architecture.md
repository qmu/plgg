---
created_at: 2026-05-30T00:17:35+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on:
---

# Replace plgg-view with a minimal Elm Architecture (sandbox, clean-slate `Html<Msg>`)

## Overview

Today `packages/plgg-view` is a small, **passive** view-tree library: a `VNode`
`Box` union (`Element`/`Text`/`Fragment`), a `jsx-runtime`, and `foldVNode`.
It has no state or event model — interactivity lives outside it (the example
hand-wires delegated DOM events + a `loadTodos`/`render` refresh loop;
plgg-router drives re-renders). It is "well small now," and the developer chose
to **totally replace it** with a minimal **Elm Architecture (TEA)**: plgg-view
becomes a self-contained app runtime, not a render primitive.

**Confirmed design decisions** (from the scoping questions):
- **Runtime = `sandbox` (purest minimum):** `{ init: Model, update: (Msg, Model)
  => Model, view: (Model) => Html<Msg> }`. `update` is **pure** — no `Cmd`, no
  `Sub`, no effects. (Effects are a deliberate non-goal of this "minimum".)
- **Rendering = full re-render:** on each `Msg`, the runtime computes
  `update(msg, model)` then re-renders `view(model)` and `replaceChildren`s the
  container. No virtual-DOM diffing.
- **`Html<Msg>` = clean-slate:** a brand-new typed tree whose elements carry
  typed attributes **and event handlers that produce `Msg`**. It **replaces**
  `VNode`. SSR `renderToString(Html)` ignores handlers.
- **Reconcile plgg-router:** routing folds into the architecture — the URL lives
  in the `Model`, navigation is a `Msg`, and the runtime owns `popstate` +
  in-app link interception (an Elm `Browser.application`-style runtime variant).
  plgg-router's pure path-matching is reused; its `VNode`-returning
  `Handler`/`resolve` and DOM `client` loop are subsumed by the TEA runtime.

This touches the whole front-end stack (plgg-view, plgg-server's `View`,
plgg-router, the example). It is intentionally large; the Implementation Steps
are **phased to keep the repo green at every commit**, and each phase is a clean
split point (`/drive` may implement phase-by-phase with an approval gate per
phase, or the phases can be promoted to separate tickets).

### Why TEA, and what "minimum" buys us

TEA gives a single, type-driven shape for an interactive app: state is one
immutable `Model`, all change flows through `update` as data (`Msg`), and the
view is a pure function of the model. It fits plgg's ethos exactly — pure
functions, immutable data, errors/events as values, one runtime seam. The
"minimum" (sandbox + full re-render, no `Cmd`/`Sub`/diffing) is the smallest
thing that is still recognizably TEA and removes the example's hand-rolled
event/refresh wiring entirely.

## Progress

- **Phase 1 — DONE** (committed as a standalone green milestone; ticket kept in
  `todo/` for the rest). plgg-view now ships the TEA core **coexisting with the
  legacy VNode**: `Html<Msg>` + `Attribute<Msg>` (static attrs + `onClick`/
  `onInput`/`onChange`/`onSubmit`/`on` handlers), Elm hyperscript builders
  (`div`/`button`/`text`/…), `foldHtml`, `mapHtml`, pure `renderToString` (SSR,
  handlers dropped), and a `plgg-view/client` subpath with the `sandbox` runtime
  + DOM `render`. 46 tests (incl. a happy-dom counter sandbox) at ≥91% coverage;
  `scripts/check-all.sh` green (VNode and all consumers untouched). `happy-dom`
  added to plgg-view devDeps; `./client` entry added to package.json/vite.
- **Phases 2–6 — TODO**: `application` routing runtime; plgg-server `View`→`Html`;
  example rewritten as a TEA app (resolve the HTTP/effects tension — recommend a
  client-only TEA demo); plgg-router shrink to its pure path toolkit; remove the
  legacy VNode/jsx-runtime. Resume with `/drive`.

## The architecture (the design to build)

### 1. `Html<Msg>` — the view tree (clean-slate, replaces `VNode`)

An immutable `Box`-union parameterized by the app's `Msg`:

```
Html<Msg> =
  | Element<Msg>  // tag + attributes + children
  | Text          // a string leaf
```

(Drop `Fragment` for the minimum unless a top-level list is needed — decide in
Open Questions.) An `Element<Msg>` carries:
- **Attributes** `ReadonlyArray<Attribute<Msg>>`, where `Attribute<Msg>` is a
  `Box` union: a plain string attribute (`attr(name, value)` / helpers like
  `class_`, `href`, `type_`, `value_`) **or** an event handler
  (`on(eventName, Msg)` and ergonomic helpers `onClick(msg)`,
  `onInput((value: SoftStr) => msg)`, `onSubmit(msg)`, `onChange(...)`). The
  handler channel is what makes the tree `Html<Msg>` rather than passive `VNode`.
- **Children** `ReadonlyArray<Html<Msg>>`.

**Elm-style hyperscript builders, no JSX.** Real Elm is `div [class "x"] [text
"y"]`, not JSX — so this replacement **removes the jsx-runtime** and ships
builder functions: `el(tag, attrs, children)`, common-tag helpers (`div`,
`button`, `input`, `ul`, `li`, `a`, `span`, `h1`, `p`, `form`, `main_`…), and
`text(value)`. This is a deliberate, "more Elm" simplification and deletes
`jsx.ts`/`jsx-runtime.ts`/`jsx-dev-runtime.ts` and the tsconfig `jsxImportSource`
wiring. (See Open Questions if JSX retention is desired instead.)

`Html<Msg>` is a **functor over Msg**: a `mapHtml(f: A => B)(Html<A>): Html<B>`
lets a parent embed a child component's view (Elm's `Html.map`). Provide it.

### 2. `sandbox` — the runtime (the one imperative seam)

```
sandbox<Model, Msg>(program: {
  init: Model;
  update: (msg: Msg, model: Model) => Model;
  view: (model: Model) => Html<Msg>;
}): (container: Element) => () => void   // mount → cleanup
```

The runtime holds the current `Model` in a closure (the single, justified
mutable seam — Elm's runtime is imperative too; comment it). A `dispatch(msg)`
sets `model = update(msg, model)` then re-renders. Initial mount renders
`view(init)`. Rendering builds real DOM from `Html` via a fold (the clean-slate
successor to `foldVNode`): elements create nodes, set safe attributes, and
`addEventListener` each handler to call `dispatch(handlerMsg)`; full re-render
`replaceChildren`s on every update (handlers are re-attached each render — fine
for the minimum). Returns a cleanup that removes the container's children/
listeners.

### 3. SSR — `renderToString(Html)` (handlers ignored)

A pure `Html<Msg> => SoftStr` fold producing HTML (escaping via the existing
`escape`/`isSafeAttrName` logic, ported from plgg-server's View). Event
handlers are dropped (no events on the server). This lets the server render the
initial `view(init)` for first paint; the client `sandbox` then takes over
(hydration is full re-render in the minimum — documented). Decide whether
`renderToString` lives in plgg-view (recommended — it's pure `Html`→string) or
stays in plgg-server.

### 4. `application` — routing-aware runtime (the plgg-router reconcile)

An Elm `Browser.application`-style variant that keeps routing pure-sandbox-
compatible **without `Cmd`**:

```
application<Model, Msg>(program: {
  init: (url: Url) => Model;
  update: (msg: Msg, model: Model) => Model;
  view: (model: Model) => Html<Msg>;
  onUrlChange: (url: Url) => Msg;   // runtime → app, on popstate / link nav
}): (container: Element) => () => void
```

The runtime owns: reading the current URL into `init`, intercepting same-origin
in-app `<a href>` clicks (reusing the link-guard logic currently in
plgg-router's `client.ts` — modifier-clicks/target/download/rel/cross-origin
pass through), `pushState` + dispatch `onUrlChange(newUrl)`, and `popstate` →
`onUrlChange(currentUrl)`. The app puts the route in its `Model` (mapping
`Url → route` with plgg-router's **pure** `compilePattern`/`matchSegments`/
`parseQuery`), so navigation is just data flowing through `update`. Link-driven
navigation needs no `Cmd`; **programmatic** navigation (push from `update`) is a
non-goal of the minimum (it would require an effect seam) — flag it.

**plgg-router shrinks to its pure core.** Keep `Segment`/`compilePattern`/
`matchSegments`/`parseQuery`/`param`/`query` (pure, DOM-free) as the routing
toolkit the `application` runtime and apps consume. Remove/retire the
`VNode`-returning `Handler`, `Route`, `Router`, `resolve`, and the DOM `client`
(`start`/`push`/`replace`) — the TEA runtime owns the DOM/History loop now.
(Open Question: does the pure matcher stay in plgg-router, or move into
plgg-view's routing module? Recommend it stays in plgg-router as a pure lib.)

## Key Files

### plgg-view — rewritten
- **Remove**: `src/Vnode/model/VNode.ts`, `src/Vnode/usecase/{jsx,fold}.ts`,
  `src/jsx-runtime.ts`, `src/jsx-dev-runtime.ts`, and the tsconfig/vite
  `jsx`/`jsxImportSource` + jsx-runtime entry wiring. (Phase: last, after
  consumers move off `VNode`.)
- **Add**: `src/Html/model/Html.ts` (`Html<Msg>`, `Element`, `Text`),
  `src/Html/model/Attribute.ts` (`Attribute<Msg>`, `attr`/`on`/`onClick`/
  `onInput`/… helpers), `src/Html/model/element.ts` (tag builders + `text`),
  `src/Html/usecase/fold.ts` (`foldHtml` algebra successor), `src/Html/usecase/
  mapHtml.ts`, `src/Html/usecase/renderToString.ts` (+ ported `escape`).
- **Add (browser seam, `./client` subpath)**: `src/Program/usecase/sandbox.ts`,
  `src/Program/usecase/application.ts`, `src/Program/usecase/render.ts` (Html→DOM
  fold with handler wiring). Mirror plgg-router's `./client` subpath split so the
  core entry stays DOM-free and SSR-safe.
- **package.json/tsconfig/vite**: drop jsx entries; add `.`/`./client` subpaths
  like plgg-server/plgg-router; keep ≥90% coverage (the `client`/seam files
  excluded per precedent, `sandbox`/`application`/`render` happy-dom-tested).
- README rewrite: from "JSX VNode runtime" to "minimal Elm Architecture".

### plgg-server — `View` reworked to the new Html
- `src/View/usecase/{render,renderToString,htmlDocument,response}.ts` currently
  consume `VNode`. Rework to consume plgg-view's new `Html` (or, if
  `renderToString` moves into plgg-view, thin these to re-export/wrap). The
  `escape`/`isSafeAttrName` logic is shared with plgg-view's SSR — dedupe (one
  home, likely plgg-view).

### plgg-router — shrunk to the pure path toolkit
- Keep `Routing/model/Segment`, `Routing/usecase/{compilePattern,matchSegments,
  parseQuery,param}`. Remove `Routing/model/{Handler,Route,Router,Location}` (or
  keep a minimal `Url`/`Location`), `Routing/usecase/{resolve,client}`, the
  `./client` subpath. Update README ("pure client-side path matching consumed by
  plgg-view's `application` runtime").

### example — rewritten as a TEA app
- Replace `src/client.tsx` + `clientRouter.ts` + the `view/*.tsx` JSX components
  with a TEA app: `Model` (todos + current route + form state), `Msg`
  (Add/Toggle/Delete/UrlChanged/FormInput…), pure `update`, `view(model): Html<Msg>`
  built with the new builders, and `application({init, update, view, onUrlChange})`
  mounted on `#root`. The SSR side (`controller/app.ts`) renders `view(init)` via
  the new `renderToString`. **Note the tension**: pure-sandbox `update` cannot do
  HTTP — the To-Do app currently fetches via plgg-fetch. Reconcile in Open
  Questions (see below); the example may need to seed `Model` from SSR data and
  treat mutations as… an effect the minimum doesn't have. This is the sharpest
  design constraint of the whole ticket.

## Related History

- [20260527142355-create-plgg-view-presentation-layer.md](.workaholic/tickets/archive/plgg-view/20260527142355-create-plgg-view-presentation-layer.md) — Created the `VNode`/jsx-runtime/`foldVNode` this ticket replaces; establishes the per-package scaffolding doctrine the new plgg-view keeps.
- [20260529003601-add-plgg-router.md](.workaholic/tickets/archive/work-20260528-143038/20260529003601-add-plgg-router.md) — plgg-router's pure path matcher (`Segment`/`compilePattern`/`matchSegments`/`parseQuery`) is reused; its `client.ts` link-interception guards are the basis for the `application` runtime's click handling; its `Handler`/`resolve` (`Location → VNode`) are superseded by TEA `view`.
- [20260529151501-integrate-plgg-router-into-example.md](.workaholic/tickets/archive/work-20260528-143038/20260529151501-integrate-plgg-router-into-example.md) — The current example's router-driven `render` + `loadTodos` loop and `pipe(await get, matchResult)` client fetching — exactly the hand-wiring TEA replaces, and the source of the HTTP-vs-pure-sandbox tension.
- [20260529230225-add-plgg-coding-style-claude-skill.md](.workaholic/tickets/archive/work-20260528-143038/20260529230225-add-plgg-coding-style-claude-skill.md) — The new code must obey `plgg-coding-style` (Box unions, expression bodies, `Option`/`Result`, no `as`/`any`); the runtime's mutable model ref is the one justified imperative seam (comment it, like `findAnchor`).

## Implementation Steps (phased, green at every commit)

1. **plgg-view TEA core (coexists with `VNode`).** Add the `Html`/`Attribute`/
   builders, `foldHtml`, `mapHtml`, `renderToString(Html)`, and the `./client`
   `sandbox` + `render`. Keep `VNode`/jsx untouched for now so nothing breaks.
   Colocated specs (happy-dom for the DOM runtime); ≥90% coverage. Ship a
   standalone runnable TEA counter/todo demo (`example.ts`).
2. **`application` runtime + plgg-router pure-core consumption.** Add
   `application` (popstate + link interception, `onUrlChange`), consuming
   plgg-router's pure `matchSegments`/`parseQuery` (add plgg-router as a
   plgg-view devDep/peer for the demo, or have apps wire it). Demo a 2-route TEA
   app. plgg-router untouched yet.
3. **Migrate plgg-server `View` to `Html`.** Point `renderToString`/`render`/
   `htmlDocument` at the new `Html` (dedupe `escape` into plgg-view). Keep the
   `VNode` path only if still referenced; otherwise switch. Green.
4. **Rewrite `src/example` as a TEA app** on the new builders + `application`,
   resolving the HTTP tension (Open Questions). Update SSR to `renderToString`
   the new `view(init)`. Green (example specs rewritten).
5. **Shrink plgg-router** to the pure path toolkit (remove `resolve`/`client`/
   `Handler`/`Router`); update its specs/README. Green.
6. **Remove legacy** `VNode`/jsx-runtime from plgg-view and any dead `VNode`
   paths in plgg-server once unused. `scripts/check-all.sh` green end-to-end.

## Patches

> No patches — a from-scratch architecture. The design above is the spec; build
> it phase by phase.

## Considerations

- **Pure sandbox vs. real apps need effects.** `update: (Msg, Model) => Model`
  cannot perform HTTP, timers, or programmatic navigation. The To-Do example
  *fetches* and *mutates* over HTTP — irreconcilable with a pure sandbox as-is.
  Options to resolve in this ticket: (a) keep the example read-only / seed `Model`
  from SSR and drop live mutations (truest minimum, weakest demo); (b) make the
  demo a self-contained in-memory app (counter / client-only todo list) that
  needs no server, and keep the HTTP To-Do app on the *old* stack until a future
  `Cmd`/`element` ticket; (c) widen the minimum to `sandbox + effect hook`
  (the option **not** chosen). **Recommend (b)**: ship a client-only TEA todo
  demo that genuinely exercises the architecture, and explicitly defer the
  HTTP-backed app to a follow-up that introduces `Cmd`. Flag prominently.
- **Full re-render re-attaches listeners.** Each update rebuilds the DOM subtree
  and re-adds every handler. Correct but not efficient; acceptable for the
  minimum. Document it; vdom diffing is the named follow-up.
- **The mutable model ref is the one imperative seam** (like Elm's runtime, like
  `findAnchor`'s DOM walk). Confine it to `sandbox`/`application`, comment the
  rationale, and keep everything else pure. No `as`/`any` (`plgg-coding-style`).
- **Security/accessibility of the event runtime.** `render` must keep the
  `isSafeAttrName` attribute gating; the `application` link interceptor must keep
  plgg-router's guards (modifier-clicks, `target`/`download`/`rel`, cross-origin,
  non-`http(s)` pass-through) — this is the project's first interactive runtime,
  so `standards:leading-accessibility` (keyboard-operable `<a href>`, focus,
  semantic builders) and `standards:leading-security` (no handler injection, safe
  attrs) apply.
- **Clean-slate blast radius is the whole front-end.** Because `Html` replaces
  `VNode`, plgg-server's View, plgg-router, and the example all move. The phased
  order keeps each commit green; do not collapse phases into one mega-commit.
- **Scaffolding parity.** New plgg-view keeps the strict tsconfig, vite lib+dts,
  `.`/`./client` subpath split (core stays DOM-free / SSR-safe), and ≥90%
  coverage, exactly like plgg-server/plgg-router.
- **Naming = Elm vocabulary** (Ubiquitous Language): `Model`, `Msg`, `init`,
  `update`, `view`, `sandbox`, `application`, `Html`, `Attribute`, `on`/`onClick`,
  `text`, `map`. Don't coin alternatives.

## Open Questions (decide during implementation, document in Final Report)

- **The HTTP/effects tension** (above) — recommend a client-only TEA demo now,
  HTTP-backed app deferred to a `Cmd` follow-up. This single decision shapes the
  example phase the most.
- **JSX vs. hyperscript builders** — recommend builders (more Elm, deletes the
  jsx-runtime). Confirm; if JSX is wanted, `Html<Msg>` must thread `Msg` through
  the jsx runtime (harder).
- **`Fragment`** — keep a top-level fragment/list or require a single root
  element per `view`? Elm requires a single root-ish (`Html msg`); minimum can
  too.
- **Where the pure matcher and `renderToString` live** — recommend matcher stays
  in plgg-router (pure), `renderToString` moves into plgg-view (pure `Html`→
  string); plgg-server's View becomes a thin wrapper.
- **Hydration** — the minimum re-renders from `init` on mount (SSR markup is
  replaced, not reused). Accept for now; true hydration is a follow-up.
- **Should this be one ticket or an epic?** It is written as one phased design;
  if the team prefers, phases 1–2 (plgg-view TEA + application) can be one ticket
  and 3–6 (stack migration + legacy removal) a second. Decide before driving.
