# @plgg/example

> A To-Do app demo for the [plgg monorepo](../../README.md). The single
> examples package — no separate `example-*` packages.

A working To-Do list (add, toggle, delete, **filter + search**) built as a
**minimal Elm Architecture** program on plgg-view. The point of the demo: **one
pure `view` renders both ways** — server-side to an HTML string (SSR, via
plgg-server), and client-side into the live DOM (CSR, via plgg-view's
`application`). State is one immutable `Model`, every change is a `Msg`, and
`update`/`view` are pure functions.

It also exercises the rest of the plgg-view/-router surface: the `filter`/search
slice is **reflected to the URL** (`?filter=…&q=…`, deep-linkable, back/forward
works) via plgg-router's typed query codec and plgg-view's `toUrl`/`historyMode`
seam — no imperative URL setters; and list items **animate in/out** via the
declarative `fadeIn`/`fadeOut` transition directives.

## Layout

```
packages/example/
├── index.html       # CSR-only dev entry (vite) — a #root div + the client module
└── src/
    ├── Todo.ts       # the Todo domain type (pure data)
    ├── app.ts        # the program: Model, Msg, pure init/update/view  ← the shared core
    ├── main.ts       # CSR entry — application(app) mounts on #root
    └── server.ts     # SSR entry — plgg-server renders view(init) + serves the client bundle
```

| Piece         | File                           | Role                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Program**   | [`app.ts`](./src/app.ts)       | `Model` (todos + draft + nextId + filter + search `q`), `Msg` (DraftChanged/Added/Toggled/Deleted/FilterChanged/SearchChanged/UrlChanged), pure `update`, pure `view(model): Html<Msg>`. Handlers in the tree (`onInput`/`onSubmit`/`onChange`/`onClick`) produce `Msg`s; `filter`/`q` are projected to the URL via `toUrl`. This is the one source of truth both render targets share. |
| **CSR entry** | [`main.ts`](./src/main.ts)     | `application(app)(#root)` from `plgg-view/client` — holds the live model, diffs the `Html` tree into the DOM on every `Msg`, and reflects `filter`/`q` into the address bar.                                                                                                                                                                                                            |
| **SSR entry** | [`server.ts`](./src/server.ts) | A plgg-server `web()` app: `GET /` → `pageResponse({ root: view(init), clientEntry: "/main.js" })` (folds `Html` → HTML string via plgg-view's `renderToString`); `GET /main.js` → the built client bundle. Served with `serve` (`plgg-server/node`).                                                                                                                                   |

## SSR + CSR, one `view`

```
            view(init): Html<Msg>
           /                      \
   SSR (server)                CSR (client)
   renderToString          render → live DOM
   (handlers dropped)      (application dispatches Msg → update → diff/patch)
           \                      /
        same markup in <div id="root">
   server paints it; the client application takes over
```

`pageResponse` wraps `view(init)` in a full document with the markup inside
`<div id="root">` and a `<script type="module" src="/main.js">` that boots the
client. `main.ts` mounts `application(app)` on that **same** `#root`, so the
client takes over the server's node. Re-renders diff/patch the `Html` tree in
place (focus-safe); hydration is still a named follow-up, so on mount the list
re-renders from `init` and is driven client-side.

## Imports at a glance

```ts
// the shared program
import {
  div,
  form,
  input,
  button,
  ul,
  li,
  text,
  onSubmit,
  onInput,
  onClick,
  type Html,
} from "plgg-view";
// CSR
import { application } from "plgg-view/client";
// SSR
import {
  web,
  get,
  toFetch,
  pageResponse,
  javascriptResponse,
  notFound,
} from "plgg-server";
import { serve } from "plgg-server/node"; // node:http adapter
```

No JSX — views are written with Elm-style element builder functions
(`div([attrs], [children])`), and handlers (`onClick<Msg>(msg)`) are typed to produce the app's
`Msg`. See [`packages/plgg-view/README.md`](../plgg-view/README.md) for the
architecture.

## Run it

CSR-only (fastest — Vite dev server, no Node server):

```sh
cd packages/example
npm install
npm run serve        # vite → http://localhost:5173 (mounts on #root)
```

Full SSR + CSR:

```sh
npm run build        # bundle the client → dist/main.js (the SSR page loads this)
npm run serve:ssr    # tsx src/server.ts → http://localhost:3000
```

Open `http://localhost:3000`: the server-rendered To-Do shell appears immediately
(view `curl -s localhost:3000/` to see the raw SSR HTML), then `/main.js` boots
the client `application` and the form becomes interactive — add a To-Do (it fades
in), toggle the checkbox, filter/search (the URL updates), click delete (it fades
out).

## Tests

`npm test` runs [`app.spec.ts`](./src/app.spec.ts): the pure `update` transitions,
the `view` → HTML string (SSR through plgg-view's `renderToString`), the full SSR
page through plgg-server's `pageResponse`, and the running app over the real DOM
(`application` under happy-dom — add-a-todo through the form, filter/search URL
reflection, deep-link seeding). One program, validated on both render paths.
