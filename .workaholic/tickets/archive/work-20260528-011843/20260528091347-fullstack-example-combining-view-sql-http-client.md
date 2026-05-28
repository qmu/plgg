---
created_at: 2026-05-28T09:13:47+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain, Infrastructure]
effort: 2h
commit_hash: 620a9a2
category: Added
depends_on:
---

# Full-stack `example` combining plgg-view + plgg-sql + plgg-http-client (+ router)

## Overview

Extend the single `src/example` package into one end-to-end full-stack demo that
exercises the three recently-added POC libraries together with the server:

- **plgg-http-router** serves the app over `node:http`.
- **plgg-sql** backs the data (a `node:sqlite` `Db` behind a seam; routes query
  it as `proc`/`pipe` steps).
- **plgg-view** renders the data as SSR HTML (via the router's `View` module) and
  re-renders the same VNode tree on the client (CSR).
- **plgg-http-client** calls the server's JSON API as a separate node script,
  decoding responses into the typed domain model.

Today `src/example` only demonstrates the plgg-view + plgg-http-router SSR/CSR
loop over a static `Article`/`FEATURES` list; plgg-sql and plgg-http-client are
absent. The goal is to make all four packages meet in one demo, reusing the
existing `modeling/Article.ts` `asArticle` caster as the single shape for SQL row
decode **and** HTTP body decode.

**Review-and-fix mandate**: while wiring this up, review the seams across these
packages and fix what doesn't connect cleanly (see Considerations). This ticket
covers both the example and the integration fixes it surfaces.

## Key Files

- `src/example/package.json` - add `plgg-sql` and `plgg-http-client` as
  `file:` deps; add a `client` script (`tsx src/client/main.ts`). Existing deps:
  plgg, plgg-view, plgg-http-router.
- `src/example/src/ssr/server.ts` - PRIMARY: add DB-backed `GET /` (SSR) and
  `GET /api/articles` (JSON) routes; keep `/client.js`. Handlers end with
  `.then(mapErr(toHttpError))`. (Watch the `__dirname`/ESM seam.)
- `src/example/src/App.tsx` - change to accept `{ articles }` props so the same
  tree renders DB data on both SSR and CSR.
- `src/example/src/modeling/Article.ts` - REUSE `asArticle` for both
  `decodeRows(asArticle)` (plgg-sql) and `decodeJsonBody(asArticle)` (client).
- `src/example/src/csr/client.tsx` - hydrate `App({articles})`; obtain the data
  the SSR used (prefer server-inlined data over a browser fetch — see
  Considerations re: node:http).
- `src/example/src/db/open.ts` (NEW) - `node:sqlite` `Db` seam (copy the `open()`
  pattern from `src/plgg-sql/example-web.ts`); seed an `articles` table.
- `src/example/src/client/main.ts` (NEW) - standalone plgg-http-client demo
  (mirror `src/plgg-http-client/example.ts`): `get`/`post` + `decodeJsonBody`,
  exhaustive `match` over the `ClientError` `$` vocabulary.
- `src/example/vite.config.ts`, `tsconfig.json` - CSR bundle config + JSX
  (`jsxImportSource: plgg-view`); ensure the browser bundle does not pull
  `node:http`.
- `src/plgg-sql/package.json`, `src/plgg-http-client/package.json` - FIX: nest
  the `exports` map with a `types` condition (NodeNext ignores the top-level
  `types` field once an `exports` map exists) so the example's `tsc` resolves
  their types. `plgg-http-router` already has this shape.
- `src/plgg-sql/example-web.ts`, `src/plgg-http-client/example.ts` - BLUEPRINTS
  for the server DB routes / `toHttpError` fold and the client script.
- `sh/npm-install.sh` - already lists plgg-sql + plgg-http-client + example;
  confirm. `sh/build.sh`/`sh/check-all.sh` already cover ordering.

## Related History

The three POCs were created on the branches now merged into this staging branch;
two prior cross-package integrations (a router+sql server, the example
consolidation) landed as direct commits (no tickets) and are the load-bearing
prior art.

- [20260527142355-create-plgg-view-presentation-layer.md](.workaholic/tickets/archive/plgg-view/20260527142355-create-plgg-view-presentation-layer.md) - Created plgg-view (VNode, jsx-runtime, renderToString); documents the JSX-via-tsconfig setup and the `cd`-into-package `tsx` gotcha any example must respect.
- [20260527142355-create-plgg-sql-builder.md](.workaholic/tickets/archive/plgg-sql/20260527142355-create-plgg-sql-builder.md) - Created plgg-sql (`sql` template, `Db`/executor seam, `query`/`exec`/`transaction`, `decodeRows`); `example-web.ts` is the router+sql blueprint.
- [20260527142356-create-plgg-http-client.md](.workaholic/tickets/archive/plgg-http-client/20260527142356-create-plgg-http-client.md) - Created plgg-http-client (`request`/`get`/`post`, `decodeJsonBody`, `ClientError`); its `example.ts` already targets the router server; surfaced the `exports.types` NodeNext friction.
- [20260527142355-rename-plgg-web-to-plgg-http-router.md](.workaholic/tickets/archive/plgg-http-client/20260527142355-rename-plgg-web-to-plgg-http-router.md) - Established the `plgg-http-router` name the client and example depend on.
- [20260226053744-make-comprehensive-readme.md](.workaholic/tickets/archive/drive-20260226-032733/20260226053744-make-comprehensive-readme.md) - Establishes the single-examples-package policy (no separate `example-*` packages) the demo must follow.

## Implementation Steps

1. **Fix NodeNext `exports`** on `src/plgg-sql/package.json` and
   `src/plgg-http-client/package.json`: nest each `import`/`require` into
   `{ types, default }` (mirror `plgg-http-router`). Rebuild both
   (`npm run build`) so downstream `tsc` sees their types.
2. **Wire example deps**: add `plgg-sql` + `plgg-http-client` `file:` deps to
   `src/example/package.json`; run `sh/npm-install.sh`.
3. **DB seam**: add `src/example/src/db/open.ts` — a `node:sqlite` `Db`
   (`DatabaseSync`) built per `plgg-sql/example-web.ts`'s `open()`; create + seed
   an `articles` table matching `asArticle` (`id`, `createdAt`, `name`, `memo`).
4. **Server routes** in `ssr/server.ts`:
   - `GET /api/articles`: `proc(sql\`SELECT … FROM articles ORDER BY id\`,
     query(db), decodeRows(asArticle), (xs) => jsonResponse(xs)).then(mapErr(toHttpError))`.
   - `GET /`: same query, then `pageResponse({ title, root: App({ articles }),
     clientEntry: "/client.js" })`.
   - Define a small `toHttpError` edge fold (SqlError → 500/409, InvalidError →
     400) reading the object-content `HttpError` shapes.
5. **App props**: change `App` to `App({ articles }: { articles: ReadonlyArray<Article> })`;
   update `App.spec.tsx` and any callers.
6. **Client script**: add `src/example/src/client/main.ts` using plgg-http-client
   `get("http://localhost:3000/api/articles")` → `decodeJsonBody(asArticle list)`
   → exhaustive `match` over `ClientError` (`networkError$`, `notFound$`,
   `badRequest$`, …). Run via `tsx` (NOT bundled for the browser).
7. **CSR hydrate**: render `App({ articles })` into `#root`; supply the data the
   server already used (inline it into the SSR document for the client to read)
   to keep `plgg-http-client`/`node:http` out of the browser bundle.
8. **Tests** (>90% coverage): DB route handlers against an in-memory
   (`:memory:`) sqlite `Db`; the client decode path against a stubbed/served
   response; updated `App.spec.tsx` for the data-driven tree.
9. **Verify**: `sh/build.sh` (dependency order) then `sh/tsc-*`/`sh/test-*` for
   plgg-sql, plgg-http-client, plgg-http-router, plgg-view, and example
   (or `sh/check-all.sh`). Confirm the example `serve` + `client` scripts run.

## Considerations

- **NodeNext `exports.types` (Domain/Infra, `standards:leading-validity`)**:
  `plgg-sql`/`plgg-http-client` flat `exports` maps hide their types from a
  NodeNext consumer; nest with a `types` condition before the example can
  type-check (`src/plgg-sql/package.json`, `src/plgg-http-client/package.json`).
- **Keep `node:http` out of the browser bundle (Infra, vendor-neutrality)**:
  `plgg-http-client`'s seam imports the `plgg-http-router` top barrel, which
  re-exports `Serving`/`node:http`. Run the client demo as a node `tsx` script;
  do NOT import plgg-http-client from `csr/client.tsx` (would pull `node:http`
  into the vite browser bundle). The router's `/client` subpath stays browser-safe.
- **Seam isolation**: `node:sqlite` only in `db/open.ts`, `node:http` only in
  `serve`, `fetch` only in plgg-http-client's seam, DOM only in the router's
  `/client` `render` — confine each platform type to one module.
- **One model, both sides (`standards:leading-validity`)**: `asArticle` decodes
  SQL rows (`decodeRows`) and HTTP bodies (`decodeJsonBody`); ensure the seeded
  row values satisfy `asTime`/`asSoftStr`/`forOptionProp` and survive a JSON
  round-trip (`jsonResponse` → `decodeJson` → `asArticle`).
- **Error object-content**: `toHttpError` and the client `match` arms must read
  the structured `HttpError` `content` (`.content.message`/`.path`/`.allowed`/
  `{status,message}`), not bare strings (this branch reshaped the vocabulary).
- **Errors as values / no `as`/`any`/`ts-ignore`** (CLAUDE.md): every fallible
  step is a `Result`/`PromisedResult`; `Option` for absence; expression-only,
  data-last bodies.
- **`__dirname`/ESM in `server.ts`**: the existing `readFileSync(join(__dirname,…))`
  works under CJS `tsx`; if the example moves to ESM, switch to
  `fileURLToPath(import.meta.url)`.
- **Accessibility (UX, `standards:leading-accessibility`)**: the rendered HTML
  (article list) should be semantic and WCAG 2.2 AA-conformant; keep the
  emergent design-system consistent with the existing `view/` components.
- **Single example package**: extend `src/example`; do NOT create a new
  `example-*` package.
- **Test against real components**: use a real `:memory:` sqlite `Db` and a real
  served response rather than mocks.

## Final Report

Development completed. `src/example` is now one end-to-end full-stack demo:
`src/db/open.ts` (node:sqlite → plgg-sql `Db`, seeded), `src/server/app.ts`
(`proc` chains: query → `decodeRows(asArticle)` → SSR `pageResponse` / JSON API),
a data-driven `App.tsx`, `ssr/server.ts`, a native-`fetch` `csr/client.tsx`
hydrate, and `src/client/main.ts` (the plgg-http-client demo with an exhaustive
`ClientError` `$`-pattern fold). `asArticle`/`asArticles` is reused at every
boundary. example 10/10 tests, `tsc` clean, CSR bundle builds; ran the server +
`npm run client` end-to-end (`got 3 article(s)`), SSR page renders the DB rows;
plgg-sql 23/23 and plgg-http-client 25/25 unaffected.

### Discovered Insights

- **Insight**: A decoded domain `Article` cannot round-trip through JSON — its
  `memo: Option` is a `Box` (`{__tag,content}`) and `Time` is a `Date`. The fix
  was to make the **wire shape the raw (compacted) DB row** (plain JSON = exactly
  `asArticle`'s input) and run `asArticle` at each *consumer* (SSR server, browser
  hydrate, node client), never serializing the decoded domain object.
  **Context**: For any plgg HTTP API, decode at the boundary; don't put branded/
  `Box`/`Option` domain values directly on the wire.
- **Insight**: `Name = Str` made `article.name` a branded `Str` `Box`, which
  plgg-view rendered as an empty `<h2></h2>` — latent because the prior example
  never rendered the name. Modeling renderable text as `SoftStr` (plain string)
  fixed it.
  **Context**: Values destined for the view should be plain `SoftStr`, not branded
  `Str` boxes, unless the view explicitly unwraps `.content`.
- **Insight**: A NodeNext consumer can't see a `file:` dep's types unless that
  package's `exports` map carries a `types` condition (the top-level `types` field
  is ignored once `exports` exists). `plgg-sql` and `plgg-http-client` needed the
  same nesting `plgg-http-router` already had.
  **Context**: Recurring monorepo gotcha — every publishable package's `exports`
  must expose `types`.
- **Insight**: `plgg-http-client`'s seam transitively imports `node:http` (via the
  router top barrel), so it must stay out of the browser CSR bundle. The CSR
  hydrate uses the browser-native `fetch` instead; plgg-http-client is exercised
  in the node `client` script. The `proc` error channel is typed `Error`, so the
  edge `toHttpError` takes `(error: Error)`.
  **Context**: Keep node-only seams off the browser bundle; match the framework's
  `Error`-typed pipeline channel at the edge fold.
