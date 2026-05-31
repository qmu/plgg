# @plgg/example

> A To-Do app demo for the [plgg monorepo](../../README.md). The single
> examples package — no separate `example-*` packages.

A working To-Do list (add, toggle, delete) built as a **minimal Elm Architecture**
program on plgg-view. The point of the demo: **one pure `view` renders both ways**
— server-side to an HTML string (SSR, via plgg-server), and client-side into the
live DOM (CSR, via plgg-view's `sandbox`). State is one immutable `Model`, every
change is a `Msg`, and `update`/`view` are pure functions.

## Layout

```
packages/example/
├── index.html       # CSR-only dev entry (vite) — a #root div + the client module
└── src/
    ├── Todo.ts       # the Todo domain type (pure data)
    ├── app.ts        # the program: Model, Msg, pure init/update/view  ← the shared core
    ├── main.ts       # CSR entry — sandbox(app) mounts on #root
    └── server.ts     # SSR entry — plgg-server renders view(init) + serves the client bundle
```

| Piece | File | Role |
|---|---|---|
| **Program** | [`app.ts`](./src/app.ts) | `Model` (todos + draft + nextId), `Msg` (DraftChanged/Added/Toggled/Deleted), pure `update`, pure `view(model): Html<Msg>`. Handlers in the tree (`onInput`/`onSubmit`/`onChange`/`onClick`) produce `Msg`s. This is the one source of truth both render targets share. |
| **CSR entry** | [`main.ts`](./src/main.ts) | `sandbox(app)(#root)` from `plgg-view/client` — holds the live model, re-renders the whole `Html` tree into the DOM on every `Msg`. |
| **SSR entry** | [`server.ts`](./src/server.ts) | A plgg-server `web()` app: `GET /` → `pageResponse({ root: view(init), clientEntry: "/main.js" })` (folds `Html` → HTML string via plgg-view's `renderToString`); `GET /main.js` → the built client bundle. Served with `serve` (`plgg-server/node`). |

## SSR + CSR, one `view`

```
            view(init): Html<Msg>
           /                      \
   SSR (server)                CSR (client)
   renderToString          render → live DOM
   (handlers dropped)      (sandbox dispatches Msg → update → re-render)
           \                      /
        same markup in <div id="root">
   server paints it; the client sandbox takes over
```

`pageResponse` wraps `view(init)` in a full document with the markup inside
`<div id="root">` and a `<script type="module" src="/main.js">` that boots the
client. `main.ts` mounts `sandbox(app)` on that **same** `#root`, so the client
re-renders into the server's node and takes over. In this minimum the takeover
is a full re-render from `init` (no diffing, no hydration, no `Cmd` — those are
named follow-ups), so the To-Do list starts empty and is driven client-side.

## Imports at a glance

```ts
// the shared program
import { div, form, input, button, ul, li, text, onSubmit, onInput, onClick, type Html } from "plgg-view";
// CSR
import { sandbox } from "plgg-view/client";
// SSR
import { web, get, toFetch, pageResponse, javascriptResponse, notFound } from "plgg-server";
import { serve } from "plgg-server/node";   // node:http adapter
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
the client `sandbox` and the form becomes interactive — add a To-Do, toggle the
checkbox, click delete.

## Tests

`npm test` runs [`app.spec.ts`](./src/app.spec.ts): the pure `update` transitions,
the `view` → HTML string (SSR through plgg-view's `renderToString`), the full SSR
page through plgg-server's `pageResponse`, and the running app over the real DOM
(`sandbox` under happy-dom — add-a-todo through the form). One program, validated
on both render paths.
