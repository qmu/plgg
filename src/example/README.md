# @plgg/example

> A To-Do app demo for the [plgg monorepo](../../README.md). The single
> examples package — no separate `example-*` packages.

A working To-Do list: add, toggle completion, delete. The same component tree
renders on the server (SSR HTML) and the client (CSR/SPA); the same
`asTodo`/`asTodos` caster decodes at every wire boundary; the same
`HttpError`/`ClientError` vocabulary is folded on both sides. plgg-fetch drives
every `/api/todos` call from the browser — the typed HTTP client is the same
on the server (`plgg-server`) and on the client (`plgg-fetch`).

## Layout — classic MVC

```
src/example/src/
├── models/          # Domain types and casters — Todo, asTodo, asNewTodo, asTodoPatch.
├── db/              # node:sqlite seam — schema, seed data, SQL strings.
├── controller/      # plgg-server `Web` — the five CRUD routes + SSR page + bundle.
├── view/            # plgg-view JSX components — App, TodoItem, TodoForm.
├── index.ts         # Library surface — re-exports models, view, controller.
├── server.ts        # `npm run serve` — Node SSR/API runtime entry.
└── client.tsx       # Browser bundle entry — hydrates, then drives Ajax via plgg-fetch.
```

| Layer | File | Role |
|---|---|---|
| **Model** | [`models/Todo.ts`](./src/models/Todo.ts) | `Todo` type + `asTodo`/`asTodos` decoders. Same caster used by SQL row decode (server), JSON body decode (browser), and request-body validation. |
| **DB** | [`db/open.ts`](./src/db/open.ts) | `createTodosDb` (in-memory `node:sqlite`, seeded with three rows), `compactRow` (strips NULLs / coerces `completed` 0/1 → boolean), and SQL strings for list/get/insert/update/delete. |
| **Controller** | [`controller/app.ts`](./src/controller/app.ts) | `buildApp(db, bundle)` — six routes: `GET /` (SSR HTML), `GET /client.js`, `GET /api/todos`, `POST /api/todos`, `PATCH /api/todos/:id`, `DELETE /api/todos/:id`. Every handler is one `proc` chain ending in `mapErr(toHttpError)`. |
| **View** | [`view/App.tsx`](./src/view/App.tsx), [`view/TodoItem.tsx`](./src/view/TodoItem.tsx), [`view/TodoForm.tsx`](./src/view/TodoForm.tsx) | The same component tree the SSR HTML is rendered from and the CSR bundle re-renders into. Data-driven props; the CSR side wires interactions on `#root` via event delegation. |
| **SSR entry** | [`server.ts`](./src/server.ts) | Opens the DB, builds the controller, runs `pipe(app, toFetch, serve({ port: 3000 }))`. |
| **CSR entry** | [`client.tsx`](./src/client.tsx) | Bundled to `dist/client.js`. Hydrates from `/api/todos`, then handles `submit`/`change`/`click` events by calling plgg-fetch's typed `get`/`post`/`patch`/`del` and re-rendering. |

## The pattern

```
node:sqlite ──(plgg-sql Db seam)──> controller route (proc: decode → SQL → respond)
   │                                      ├─ GET /                → plgg-view SSR page
   │                                      ├─ GET /client.js       → CSR bundle
   │                                      ├─ GET    /api/todos     → JSON list
   │                                      ├─ POST   /api/todos     → JSON created
   │                                      ├─ PATCH  /api/todos/:id → JSON updated
   │                                      └─ DELETE /api/todos/:id → JSON deleted
   ▼
browser (client.tsx): plgg-fetch get/post/patch/del → decodeJsonBody(asTodo[s]) → re-render
```

`Todo`'s `completedAt: Option<Time>` is a plgg `Box` value that does NOT survive
`JSON.stringify`. The wire shape **omits** the `completedAt` key when the To-Do
is open (matching what `compactRow` does to the SQL row), so the consumer's
`forOptionProp` reads it as `None`. One model, one decoder, every boundary.

Failures fold to one shared vocabulary: `HttpError` on the server, widened to
`ClientError = HttpError | NetworkError` on the client. Both sides match by name
(`notFound$()`, `badRequest$()`, `networkError$()`, …) rather than by tag string.

## Imports at a glance

```ts
import { proc, pipe, decodeJson, chainResult, encodeJson } from "plgg";
import { web, get, post, patch, del, serve, toFetch, jsonResponse, pageResponse } from "plgg-server";
import { render } from "plgg-server/client";              // CSR (browser)
import { sql, query, exec, decodeRows } from "plgg-sql";  // DB pipeline steps
import { get as fetchGet, post as fetchPost, patch as fetchPatch, del as fetchDel, decodeJsonBody } from "plgg-fetch";
```

JSX (`<form>…</form>`) resolves to `plgg-view/jsx-runtime` via `tsconfig.json`
(`"jsx": "react-jsx"`, `"jsxImportSource": "plgg-view"`). See
[`src/plgg-view/README.md`](../plgg-view/README.md#usage) for why this line is
required (TypeScript's `react-jsx` mode defaults the source to `"react"`).

## Run the To-Do app

```sh
cd src/example
npm install
npm run build      # bundle the CSR entry → dist/client.js
npm run serve      # tsx src/server.ts → http://localhost:3000
```

Open `http://localhost:3000` in a browser: the SSR list appears immediately,
then `client.js` hydrates and takes over. Add a To-Do via the form, toggle the
checkbox, click delete — every action is a plgg-fetch call, decoded on return
with the same `asTodo` the server used to decode the row.

Or hit the API directly:

```sh
curl localhost:3000/api/todos
curl -X POST -H 'content-type: application/json' \
  -d '{"title":"Buy milk"}' localhost:3000/api/todos
curl -X PATCH -H 'content-type: application/json' \
  -d '{"completed":true}' localhost:3000/api/todos/t2
curl -X DELETE localhost:3000/api/todos/t2
```

`npm test` runs the four spec files: `models/Todo.spec.ts` (decoder), `db/open.spec.ts`
(seeded DB round-trip), `controller/app.spec.ts` (integration tests over `toFetch`
with a real in-memory DB), and `view/App.spec.tsx` (SSR + CSR isomorphism).
