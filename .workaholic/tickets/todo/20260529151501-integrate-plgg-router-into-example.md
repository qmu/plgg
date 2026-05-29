---
created_at: 2026-05-29T15:15:01+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on:
---

# Integrate plgg-router into the src/example To-Do app (list + detail routes)

## Overview

plgg-router shipped in v1 with its own standalone `example.ts` and happy-dom spec
coverage, but the real dogfooding target — the `src/example/` To-Do app — was
**explicitly deferred** to this follow-up (see the plgg-router ticket's Final
Report). Today `src/example/src/client.tsx` hydrates a single `App({ todos })`
tree at `#root` and re-renders the whole list via a hand-wired `refresh()` after
every mutation; there is **no client-side route changing**.

This ticket wires plgg-router into the example so the app becomes a real
two-route SPA:

- **`/`** — the To-Do list (the existing `App` view).
- **`/todos/:id`** — a new single-Todo **detail** view, reached by clicking a
  todo's title (a real `<a href="/todos/:id">` so the router's link interceptor
  drives navigation, and right-click / open-in-new-tab / browser back-forward
  all work).

The router (`start` from `plgg-router/client`) becomes the re-render trigger on
every location change, while the existing add/toggle/delete mutations and their
delegated `#root` listeners are preserved. This demonstrates plgg-router's
intended use end to end and proves the package against a non-trivial host.

### The central design problem: async data vs. a synchronous `Handler`

plgg-router's `Handler` is a **pure, synchronous** `(loc: Location) => VNode`,
but the example's data is **fetched asynchronously** (`get("/api/todos")`). The
chosen reconciliation (see Implementation Steps) is a **module-level cache**:
route handlers read the cached `todos` synchronously to build their `VNode`, and
a separate async `loadTodos()` fetches, updates the cache, then **re-renders the
current route** through the public `resolve` + `render`. This keeps handlers pure
and synchronous while data arrives out of band — the same pattern any real SPA
on plgg-router would use, so it is worth establishing here.

### Out of scope (consistent with plgg-router v1 deferrals)

- SSR → client-router handoff as a general mechanism (no shared route table
  between plgg-server and plgg-router; they are deliberately separate packages).
  Deep-link **first paint** is handled per Step 5, not by a handoff abstraction.
- Focus management / `aria-live` route-change announcements (deferred by
  plgg-router v1 — note explicitly, don't silently skip).
- Hash routing, navigation guards, lazy routes, nested layouts, a `<Link>`
  component. Use plain `<a href>`.

## Key Files

- `src/example/package.json` — add `"plgg-router": "file:../plgg-router"` to
  `dependencies`. `build.sh`/`check-all.sh` already build plgg-router before the
  example, so the `file:` dep resolves. Run `sh/npm-install.sh` (or
  `npm install` in `src/example/`) after.
- `src/example/src/client.tsx` — the main change. Replace the
  `wire(root) + refresh(root)`-only bootstrap with: build a `Router` (`router()`
  → `get("/", listView)` → `get("/todos/:id", detailView)`), `start(router, root,
  { render, notFound })`, and a module-level `todos` cache fed by `loadTodos()`.
  Keep `describeClientError`/`reportClient`/`reportDecode`, the
  create/toggle/delete mutations (now calling `loadTodos` instead of `refresh`),
  and the delegated `wire()` listeners (they stay on the persistent `#root`).
  Import `router`, `get`, `param`, `resolve`, `currentLocation` from
  `plgg-router` and `start` from `plgg-router/client`; keep `render` from
  `plgg-server/client`.
- `src/example/src/view/TodoDetail.tsx` — **new** plgg-view component. Renders a
  single `Todo` (title, completed state, `createdAt`, `completedAt` Option
  matched) inside a `<main>`/heading landmark, plus a "← Back to list"
  `<a href="/">`. Export from `src/example/src/view/index.ts`.
- `src/example/src/view/TodoItem.tsx` — wrap the todo title in
  `<a href={`/todos/${todo.id}`}>` so the list links to the detail route. Keep
  the toggle checkbox and delete button (their `data-action`/`data-todo-id`
  delegation is unchanged). Ensure the link doesn't swallow the checkbox/delete
  interactions (separate elements).
- `src/example/src/controller/app.ts` — add a server route so a **deep link /
  hard refresh** of `/todos/:id` serves valid HTML instead of 404. Recommended:
  `get("/todos/:id", ...)` that fetches the todo from the db and SSR-renders the
  `TodoDetail` view inside the same `pageResponse` shell (isomorphic with the
  client route); a missing id renders a "not found" detail VNode. Register it so
  it does not shadow `/client.js` or `/api/*` (those are distinct prefixes, so
  ordering is safe). The list `get("/")` is unchanged.
- `src/example/src/view/App.spec.tsx`, `src/example/src/view/TodoDetail.spec.tsx`
  (new), `src/example/src/controller/app.spec.ts` — Minimum-Test-Harness specs
  for the detail view, the client router's `resolve` for `/` and `/todos/:id`
  (matched view, param extraction, not-found), and the new server deep-link
  route. The example has no numeric coverage gate, but `tsc --noEmit` + all specs
  must pass.

## Related History

- [20260529003601-add-plgg-router.md](.workaholic/tickets/archive/work-20260528-143038/20260529003601-add-plgg-router.md) — Created plgg-router and **deferred this exact integration**. Specifies the recipe: add the `file:` dep, `import { start } from "plgg-router/client"` + `import { render } from "plgg-server/client"`, call `start(router, root, { render })`. `StartOptions.render` is REQUIRED and host-injected (dependency direction — plgg-router never imports plgg-server). `Handler = (loc) => VNode` (sync). `resolve(router, loc) => Option<VNode>`. No `<Link>`; use `<a href>`. `push` scrolls to top; `document.title` is the host's job.
- [20260528213109-rewrite-example-as-todo-app-with-mvc-layout.md](.workaholic/tickets/archive/work-20260528-143038/20260528213109-rewrite-example-as-todo-app-with-mvc-layout.md) — Defines the To-Do app being modified (MVC layout, `client.tsx` `refresh()`/`wire()` model, the DELETE-returns-200-not-204 workaround, and the `completedAt: Option<Time>` wire-shape invariant — omit the key when `None`, never emit `null`, or `asTodo` fails).
- [20260528091347-fullstack-example-combining-view-sql-http-client.md](.workaholic/tickets/archive/work-20260528-011843/20260528091347-fullstack-example-combining-view-sql-http-client.md) — Built the original CSR hydrate loop and the decode-at-the-boundary (`asTodos`) discipline; established that `node:http` must stay out of `dist/client.js` (vite tree-shakes `serve`/`toFetch`).
- [20260527142355-create-plgg-view-presentation-layer.md](.workaholic/tickets/archive/plgg-view/20260527142355-create-plgg-view-presentation-layer.md) — `VNode`/`Component<P>`/jsx-runtime and the `jsxImportSource: "plgg-view"` wiring the new detail component and the route handlers depend on.

## Implementation Steps

1. **Add the dependency.** Add `"plgg-router": "file:../plgg-router"` to
   `src/example/package.json` `dependencies`; run `npm install` in
   `src/example/` (or `sh/npm-install.sh`). Confirm `node_modules/plgg-router`
   links the built `dist/`.
2. **Create the detail view.** Write `src/example/src/view/TodoDetail.tsx`:
   `TodoDetail({ todo }: { todo: Todo }): VNode` rendering a `<main>` with a
   heading (the title), completed state, `createdAt`, `completedAt` (Option
   matched the same way `TodoItem` does), and a `<a href="/">← Back</a>`. Add a
   `TodoDetail`-style "not found" VNode (or a separate `TodoNotFound` view) for a
   missing id. Export from `view/index.ts`.
3. **Link the list to detail.** In `TodoItem.tsx`, wrap the title text in
   `<a href={`/todos/${todo.id}`}>`. Keep the checkbox (`data-action="toggle"`)
   and delete button (`data-action="delete"`) as sibling elements so the
   delegated listeners and the link interceptor don't conflict.
4. **Rewrite `client.tsx` around the router.**
   - Add a module-level cache: `let todos: ReadonlyArray<Todo> = []`.
   - Build the router: `const appRouter = pipe(router(), get("/", () =>
     App({ todos })), get("/todos/:id", (loc) => pipe(loc, param("id"),
     chainOption((id) => find todo by id in `todos`), matchOption(() =>
     TodoNotFound(), (todo) => TodoDetail({ todo })))))`. Set
     `document.title` inside each handler (e.g. `"To-Dos"` / the todo title) —
     the host's responsibility per plgg-router v1.
   - Define `rerender(root)` = `render(pipe(resolve(appRouter,
     currentLocation()), getOr(notFoundView)), root)` using the **public**
     `resolve` + `currentLocation` + `render` — this is the data-update
     re-render path.
   - Define `loadTodos(root)`: `get("/api/todos")` →
     `matchResult(reportClient, res => pipe(res, decodeJsonBody(asTodos),
     matchResult(reportDecode, (ts) => { todos = ts; rerender(root); })))`
     (replaces `refresh`).
   - Point `createTodo`/`toggleTodo`/`deleteTodo` success branches at
     `loadTodos(root)` instead of `refresh(root)`.
   - Bootstrap: `pipe(fromNullable(document.getElementById("root")),
     mapOption((root) => { wire(root); start(appRouter, root, { render,
     notFound: notFoundView }); void loadTodos(root); }))`. `start` renders the
     initial route from the (empty) cache; `loadTodos` then fills it and
     `rerender`s. The delegated `wire()` listeners stay attached to the
     persistent `#root` and survive every render (which only replaces children).
5. **Serve deep links (server).** In `controller/app.ts`, add
   `get("/todos/:id", c => ...)`: read `:id` via `param("id")`, fetch the todo
   from the db (a single-row query — `GET_TODO_BY_ID_SQL` already exists in
   `db/open.ts` per the rewrite ticket; otherwise filter the list), and return a
   `pageResponse` whose `root` is `TodoDetail({ todo })` (or the not-found view)
   and whose `clientEntry` is `/client.js` — same shell as `/`, isomorphic with
   the client detail route. This makes a hard refresh of `/todos/:id` valid HTML;
   the client router re-renders the same view on hydrate.
6. **Specs.** Add `view/TodoDetail.spec.tsx` (renders a todo; renders not-found),
   extend `controller/app.spec.ts` for the new `/todos/:id` server route
   (found + missing id), and add a small client-router spec (resolve `/` → list,
   `/todos/:id` → detail with the right todo from a seeded cache, unknown path →
   not-found). Use `// @vitest-environment happy-dom` only where DOM is needed.
7. **Quality gates + manual smoke test.** `bash sh/tsc-example.sh` and
   `bash sh/test-example.sh` must pass; zero `as`/`any`/`@ts-ignore`/
   `@ts-expect-error`. `npm run build` in `src/example/`, then **grep
   `dist/client.js` for `node:`** — must be none (plgg-router is browser-only, so
   adding it must not drag node code in). Finally `npm run serve` and manually
   verify in a browser: list at `/`, click a title → detail at `/todos/:id`,
   browser back/forward works, `document.title` changes per route, and
   add/toggle/delete still work and re-render. Browser-Verified UI Change is the
   real gate here (no automated bundle/serve path in check-all).

## Patches

> No patches — the change is a rewrite of `client.tsx`'s bootstrap plus new view
> and controller code. See Implementation Steps for the concrete plan.

## Considerations

- **Dependency direction (the whole point).** plgg-router cannot import
  plgg-server, so the example **host-injects** `render`: `start(appRouter, root,
  { render })` with `render` from `plgg-server/client`. This is the architectural
  enforcement point, not a workaround. `.workaholic/constraints/architecture.md`
  permits `src/example` (the top-level consumer) to depend on plgg-router +
  plgg-server + plgg-view + plgg-fetch. (`src/example/src/client.tsx`)
- **Async data vs. synchronous `Handler`.** Handlers stay pure/synchronous and
  read a module-level `todos` cache; `loadTodos` fetches and `rerender`s out of
  band via the public `resolve`+`render`. Keep client async as
  `pipe(await get(...), matchResult(...))` — `proc`'s fixed `Error` type is
  incompatible with plgg-fetch's `ClientError` (documented in the example-rewrite
  ticket). (`src/example/src/client.tsx`)
- **Mutation re-render path.** create/toggle/delete call `loadTodos(root)`, which
  re-fetches and `rerender`s the *current* route — a mutation on the list
  re-renders the list; on the detail route it re-renders the detail. No separate
  `refresh()` remains.
- **Accessibility (this is the first routed UI).** Per `standards:leading-accessibility`
  (WCAG 2.2 AA): list→detail uses real keyboard-operable `<a href>` anchors (so
  modifier-click / open-in-new-tab pass through the router's interceptor); the
  detail route has a heading/`<main>` landmark and a back link; History back/
  forward works via `popstate`. **Defer with an explicit comment** (matching
  plgg-router v1): focus management on route change and `aria-live` route
  announcements — note them so they aren't read as missed requirements.
  `.workaholic/policies/accessibility.md` / `quality.md` still say "accessibility
  not applicable (no UI)" — that premise is now stale for a routed example;
  treat AA as live (a follow-up can refresh those docs).
- **`document.title` and scroll.** Per-route `document.title` is set inside the
  handlers (the example's job; a `VNode` can't express `<title>`). `push` already
  scrolls to top; `popstate` leaves scroll to the browser.
- **Deep-link first paint.** plgg-server returns 404 on no route match, so
  without Step 5 a hard refresh of `/todos/:id` would 404. Serving the SPA shell
  (ideally SSR-rendering the detail for isomorphism) fixes this. This is NOT an
  SSR-router handoff abstraction — it's one ordinary plgg-server route that
  happens to render the same view; the two routers stay independent.
- **Wire-shape invariant.** A single Todo's `completedAt: Option<Time>` must omit
  the key when `None` (never `null`) wherever it crosses JSON, or `asTodo`
  decode fails. If a `GET /api/todos/:id` endpoint is added, it must follow the
  existing `toWireTodo`/compaction rule; deriving the detail from the already-
  decoded list cache sidesteps this entirely (recommended).
- **Bundle hygiene.** Verify `dist/client.js` has no `node:` imports after the
  change (plgg-router is browser-only; the example already tree-shakes
  `serve`/`toFetch`). No `vite.config.ts` change expected.
- **Ubiquitous language.** Reuse plgg-router's `router`/`get`/`route`/`param`/
  `query` names exactly (they parallel plgg-server) — don't coin new terms.
- **Naming.** plgg-server's `Routing` is server-side (path → `HttpResponse`);
  plgg-router is client-side (path → `VNode`). The example is the one place both
  meet; keep the distinction clear in comments.

## Open Questions (decide during implementation, document in Final Report)

- **Detail data source**: derive the detail from the already-fetched list cache
  (recommended — no new endpoint, dogfoods `param` + cache), or add
  `GET /api/todos/:id`. If deriving, a deep-link load must `loadTodos` first
  (already the bootstrap order), then `rerender` shows the detail.
- **SSR of the detail route**: SSR-render `TodoDetail` server-side for
  isomorphism (recommended), or serve the list shell and let CSR route to detail
  (simpler, but a brief list→detail flash on hard refresh). Pick one and note it.
- **Re-render trigger**: the public `resolve`+`render` `rerender()` (recommended)
  vs. `replace(currentLocation().path)` to bounce through `start`'s nav handler.
  The former is more direct and avoids a spurious history op.
- **Not-found presentation**: a styled in-shell "Todo not found" VNode (200) vs.
  a real 404 on the server route. Recommend the in-shell view for demo clarity.
