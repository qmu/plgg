# @plgg/example

> The single examples package for the [plgg monorepo](../../README.md). Everything
> that demonstrates how to use the libraries lives here — there are no separate
> `example-*` packages.

It consumes `plgg`, `plgg-view`, `plgg-server`, `plgg-fetch`, and
`plgg-sql` as real dependencies (`file:`), so the imports below are exactly what
an app outside this repo would write.

## What's inside

A single end-to-end full-stack demo where all four libraries meet:

| # | Example | Where |
|---|---------|-------|
| — | plgg modeling (validation/casting with `cast`) | [`src/modeling/Article.ts`](./src/modeling/Article.ts) |
| 1 | **Database** — a `node:sqlite` seam exposing a plgg-sql `Db`, seeded | [`src/db/open.ts`](./src/db/open.ts) |
| 2 | **Server** — `proc` chains: query (plgg-sql) → decode → SSR page / JSON | [`src/server/app.ts`](./src/server/app.ts) |
| 3 | **SSR** — `App` rendered to HTML from DB rows, served | [`src/ssr/server.ts`](./src/ssr/server.ts) |
| 4 | **CSR / hydrate** — fetch `/api/articles`, decode, re-render the same `App` | [`src/csr/client.tsx`](./src/csr/client.tsx) |
| 5 | **Typed client** — plgg-fetch calls the JSON API, decodes, folds errors | [`src/client/main.ts`](./src/client/main.ts) |
| — | plgg-view gallery (standalone components) | [`src/view/`](./src/view/) |

`src/App.tsx` is the one component tree shared by SSR and CSR — author once,
render two ways, over the **same** plgg-sql-backed data. `src/modeling/Article.ts`
defines one `asArticle`/`asArticles` caster reused at every boundary: plgg-sql
row decode on the server, JSON-body decode in the browser, and
`decodeJsonBody(asArticles)` in the typed client.

## How it fits together

```
node:sqlite ──(plgg-sql Db seam)──> server route (proc: query → decode)
   │                                      ├─ GET /            → plgg-view SSR page (HttpResponse)
   │                                      └─ GET /api/articles → JSON (raw wire rows)
   ▼
browser: fetch /api/articles → decodeJson → asArticles → plgg-view render (CSR)
node:    plgg-fetch get(/api/articles) → decodeJsonBody(asArticles) → match(ClientError)
```

The wire shape is the raw row (plain JSON = `asArticle`'s input); the domain
`Article` (with `Option` `memo`) is only ever the *decoded* form, so it never has
to round-trip through JSON. Failures fold to one shared `HttpError` vocabulary.

## Imports at a glance

```ts
import { proc, pipe, decodeJson, chainResult } from "plgg";
import { web, get, serve, toFetch, jsonResponse, pageResponse } from "plgg-server";
import { render } from "plgg-server/client";          // CSR (browser)
import { sql, query, decodeRows } from "plgg-sql";          // DB pipeline steps
import { get as httpGet, decodeJsonBody } from "plgg-fetch"; // typed client
```

JSX (`<p>…</p>`) resolves to `plgg-view/jsx-runtime` via `tsconfig.json`
(`"jsx": "react-jsx"`, `"jsxImportSource": "plgg-view"`).

## Run the full-stack demo

```sh
cd src/example
npm install
npm run build      # bundle the CSR client entry → dist/client.js
npm run serve      # tsx src/ssr/server.ts → http://localhost:3000
```

Then, in another terminal:

```sh
curl localhost:3000/              # SSR HTML document (DB-backed, references /client.js)
curl localhost:3000/api/articles  # the JSON API
npm run client                    # plgg-fetch demo against the running server
```

Open `http://localhost:3000` in a browser: the server-rendered article list
appears immediately, then `client.js` fetches the same data and re-renders the
identical tree (CSR). `npm test` checks the plgg-view gallery, that `App` renders
the data both ways (SSR/CSR), and the DB-backed route handlers against an
in-memory database.
