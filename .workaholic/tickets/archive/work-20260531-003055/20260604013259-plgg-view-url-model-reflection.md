---
created_at: 2026-06-04T01:32:59+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 2h
commit_hash: c671bb4
category: Changed
depends_on: [20260604013258-plgg-router-query-codec.md]
---

# plgg-view: model→URL reflection seam (toUrl/historyMode) + nuqs-style demo

## Overview

plgg-view's `application` runtime is **one-way**: `onUrlChange(url): Msg` drives
the model *from* the URL, but nothing drives the URL *from* the model. This ticket
adds the missing direction so the address bar becomes a **pure projection of the
Model — exactly like the DOM**: you never imperatively `setQueryState` (nuqs);
you update the Model and the runtime derives the URL. Crucially this needs **no
`Cmd`/`Sub`** — the URL write is a render-time effect in the runtime's existing
imperative seam, the same category as DOM mutation and the animation play.

Two optional fields on `Application<Model, Msg>`:

- `toUrl?: (model: Model) => Url` — the model→URL projection (inverse of
  `onUrlChange`).
- `historyMode?: (prev: Model, next: Model) => "push" | "replace" | "none"` —
  default **`"replace"`** when omitted (nuqs default: typing doesn't spam
  history); `"push"` marks a real navigation; `"none"` skips the write.

After each dispatch the runtime reconciles the browser URL against `toUrl(model)`,
gated on a string diff so it is **loop-free**. The demo (in `packages/example`)
reflects a filter/search slice to `?filter=…&q=…` using ticket 1's `QueryCodec`,
proving deep-linkable, back/forward-correct state with no imperative URL setters.

## Key Files

- `packages/plgg-view/src/Program/usecase/application.ts` — **primary**.
  `Application<Model, Msg>` type (≈ lines 27–32) gains the two optional fields; the
  `dispatch` closure (≈ 146–153) gets the post-render reconcile. `onClick`'s
  existing `pushState` (≈ 160–167) and `onPopState` (≈ 171) stay — this only
  **adds** the model→URL direction.
- `packages/plgg-view/src/Program/model/Url.ts` — `Url = { path, search }`,
  `makeUrl(path, search)`. `toUrl` returns this; the reconcile compares
  `url.path + url.search` to `window.location.pathname + window.location.search`.
- `packages/plgg-view/src/Program/usecase/application.spec.ts` — the 7 existing
  happy-dom cases (entry render, link push, popstate, modifier-click,
  cross-origin, non-anchor, cleanup) are the template; add reconcile cases.
- `packages/plgg-view/src/client.ts` — public entry; the new `Application` fields
  surface automatically (no edit).
- `packages/example/src/app.ts` — **demo**. Currently `Model = { todos, draft,
  nextId }` exported as a `Sandbox<Model, Msg>` (pure `update`/`view`). Needs a
  `filter: "all" | "active" | "completed"` slice (+ reuse `draft` or add `q`), and
  conversion to an `Application` with `init(url)`, `onUrlChange`, `toUrl`.
- `packages/example/src/main.ts` — CSR entry; currently `sandbox(app)(root)` →
  switch to `application(app)(root)` so `toUrl`/`historyMode` take effect.
- `packages/example/src/Todo.ts` — `Todo { id, title, completed }`; `completed` is
  what `?filter=active|completed` filters on.
- `packages/example/package.json` — deps are `plgg`, `plgg-view`, `plgg-server`
  only. Add `"plgg-router": "file:../plgg-router"` for the demo to use
  `parseQuery`/`serializeQuery`/`queryCodec`.

## Related History

Extends the shipped application runtime; no prior ticket adds the model→URL
direction. Todo/icebox empty.

- [20260530001735-replace-plgg-view-with-minimal-elm-architecture.md](.workaholic/tickets/archive/work-20260528-143038/20260530001735-replace-plgg-view-with-minimal-elm-architecture.md)
  — introduced the `application` runtime with the `Url` model and the
  pushState/popstate/link-interception loop this plugs into; documents that
  effects/`Cmd`/`Sub` were deliberately excluded (the reflection seam respects
  that by being a render-time effect, not a `Cmd`).
- [20260529151501-integrate-plgg-router-into-example.md](.workaholic/tickets/archive/work-20260528-143038/20260529151501-integrate-plgg-router-into-example.md)
  — prior example URL-state-sync work; context for wiring a query slice into the
  current TEA example.

## Implementation Steps

1. **Type** (`application.ts`). Add to `Application<Model, Msg>`:
   `toUrl?: (model: Model) => Url;` and
   `historyMode?: (prev: Model, next: Model) => "push" | "replace" | "none";`.
2. **Reconcile in `dispatch`**. Capture the previous model before update, then
   after `render(program.view(model))`:
   ```
   const prev = model;
   model = program.update(msg, model);
   render(program.view(model));
   reflectUrl(prev, model);   // new
   ```
   `reflectUrl` (a closure / helper): if `program.toUrl` is undefined, return.
   Else compute `next = program.toUrl(model)`, build `target = next.path +
   next.search`, compare to `window.location.pathname + window.location.search`;
   if **equal, do nothing** (the string-diff gate — this is what makes it
   loop-free and avoids spurious history entries). If different, choose the mode
   via `program.historyMode ? program.historyMode(prev, model) : "replace"` and
   `match`/switch: `"replace"` → `window.history.replaceState(null, "", target)`,
   `"push"` → `pushState`, `"none"` → skip. **Never call `go`/`dispatch`** from
   here — writing history is a side effect, not a `Msg`.
3. **Loop-freedom**. Back/forward and link clicks arrive via `onUrlChange → update
   → model`; the next reconcile computes `toUrl(model)` which now equals the
   current location → no write. Verify `toUrl ∘ onUrlChange` is a lawful pair for
   the reflected slice (the app's responsibility; note it in the demo).
4. **Demo — `packages/example`**:
   - Add `"plgg-router": "file:../plgg-router"` to `package.json`.
   - `app.ts`: add `filter: "all" | "active" | "completed"` to `Model` (and a `q`
     search field, or reuse `draft`); filter the rendered todo list by it. Define
     a `QueryCodec` (`queryEnum(["all","active","completed"], "all")`,
     `queryStr("")`) from ticket 1. Convert to `Application`: `init(url)` decodes
     the entry query into the model slice; `onUrlChange(url)` folds a URL change
     into a `Msg`; `toUrl(model)` builds `makeUrl(path, "?"+serializeQuery(
     codec.encode({ filter, q })))`. Add filter-select + search UI that update the
     model (the URL follows automatically).
   - `main.ts`: `application(app)(root)` instead of `sandbox`.
5. **Build order**: `npm run build` in `packages/plgg-router` first (the example
   consumes its built `.d.ts`), then example tsc.
6. **Verify**: plgg-view `npm run tsc` + `vitest` (≥91%); example `npm run tsc` +
   `vitest`; `scripts/tsc-plgg.sh` / `scripts/test-plgg.sh` for core.

## Patches

### `packages/plgg-view/src/Program/usecase/application.ts`

> **Note**: speculative — confirm the exact `Application` type and `dispatch`
> body before applying; the reconcile helper is sketched.

```diff
 export type Application<Model, Msg> = Readonly<{
   init: (url: Url) => Model;
   update: (msg: Msg, model: Model) => Model;
   view: (model: Model) => Html<Msg>;
   onUrlChange: (url: Url) => Msg;
+  toUrl?: (model: Model) => Url;
+  historyMode?: (
+    prev: Model,
+    next: Model,
+  ) => "push" | "replace" | "none";
 }>;
```

## Considerations

- **Loop-freedom is the correctness crux** — every write gated on the
  serialized-URL string diff; the reconcile must never re-enter `dispatch`. A
  non-canonical `serializeQuery` (ticket 1) would defeat the diff and spam history
  (`application.ts` dispatch closure).
- **`historyMode` keyed on Model, not Url** — gives the app full semantic intent
  ("the `page` field changed → push; the search text changed → replace"). Default
  `"replace"` matches nuqs and keeps typing out of history (`application.ts`).
- **Peer-package independence** — plgg-view must **not** import plgg-router; it
  only knows `Url { path, search }`. The **example** composes the `QueryCodec`
  into `toUrl`/`onUrlChange` (`packages/example/src/app.ts`). Keep the runtime
  router-free.
- **No `Cmd`/`Sub` boundary holds** — the URL write is a render-time effect in the
  runtime's documented single imperative seam (the live `model` ref + History/DOM),
  not a new effect channel (`standards:implementation` domain-layer separation).
- **Modeless / reach** (`standards:design`) — the reflected URL must be
  deep-linkable and shareable, back/forward must never trap, and no state may be
  reachable only without the URL. `init(url)` seeding from the entry query is
  required, not optional (`packages/example/src/app.ts`).
- **Example currently uses `sandbox`** — the demo is a genuine conversion
  (`Sandbox` → `Application`, `main.ts` rewire), not a tweak; budget for it
  (`packages/example/src/main.ts`, `app.ts`).
- **Depends on ticket 1** — `serializeQuery` + `QueryCodec` must exist and be
  built into plgg-router's `dist` before the example can consume them.

## Final Report

Development completed as planned. `Application` gained `toUrl?`/`historyMode?`;
the runtime reflects the model into the URL after each dispatch via a string-diff-
gated `reflectUrl` + an `applyHistory` (replace/push/none) seam, with no `Cmd`.
The example was converted `Sandbox`→`Application` and now deep-links
`?filter=…&q=…` (filter change pushes history, search typing replaces). plgg-view
73 tests pass (application.ts 100% stmts/funcs/lines); example 17 tests pass
(100/93/100/100); plgg-router 38 tests still green; core `plgg` tsc clean.

### Discovered Insights

- **Insight**: the model→URL reflection needed **no new effect channel** — it
  slots into the `application` `dispatch` closure as a post-`render` step,
  precisely mirroring how the diff/patch renderer already treats the DOM as a
  projection of the model. **Context**: this is the load-bearing design idea —
  "the URL is to the model what the DOM is to the model." Any future
  reflected-output (document title, `localStorage`, `<meta>`) follows the same
  shape: a pure `model → X` projection reconciled in the runtime seam, gated on a
  diff for loop-freedom. It also means the "no `Cmd`/`Sub`" boundary genuinely
  still holds.
- **Insight**: distinguishing `pushState` vs `replaceState` in a happy-dom test
  can't be done from `window.location` (both update it identically). **Context**:
  spy both via `Object.defineProperty(window.history, "pushState", { value: … })`
  — its `value` is untyped, so the recording stub stands in with **no cast** — and
  call through to the originals so the loop-free gate (which reads
  `window.location`) still works. Restore in `afterEach`. Reusable for any
  history-API assertion.
- **Insight**: the example had to convert from `sandbox` to `application`
  end-to-end (`main.ts` rewire, `app.spec.ts` mount switch, a new
  `plgg-router` `file:` dep) and keep `init` as a `Model` **constant** so
  `server.ts`'s `view(init)` SSR path kept working, while `Application.init`
  became `(url) => ({ ...init, ...codec.decode(parseQuery(url.search)) })`.
  **Context**: when adding URL-seeding to an app shared by SSR + CSR, keep the
  zero-arg default model for the server and layer the URL decode only in the
  client `init` — don't make the server reconstruct a `Url`.
