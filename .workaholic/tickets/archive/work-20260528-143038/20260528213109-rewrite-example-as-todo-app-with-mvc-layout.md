---
created_at: 2026-05-28T21:31:09+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain, Infrastructure, DB]
effort: 4h
commit_hash: 1efd304
category: Changed
depends_on:
---

# Rewrite `src/example/` as a real To-Do app with classic MVC layout

## Overview

Replace the current abstract `Article` example with a real, recognizable application: **a To-Do list app** with full CRUD. Organize the code in **classic MVC** directories — `src/models/`, `src/db/`, `src/controller/`, `src/view/` — with real semantic names throughout. The three runtime entries (`server.ts`, `client.tsx`, `cli.ts`) sit at the package source root as siblings of the MVC directories.

This is a domain rewrite, not just a directory shuffle. The current `Article` model has three rows and one read endpoint; a To-Do app exercises CRUD (create / read / toggle complete / delete) across all three patterns:

- **SSR** — the initial list of To-Dos rendered server-side from the DB.
- **CSR** — the browser bundle that handles user interactions (add, toggle, delete) and re-renders.
- **Typed-client (plgg-fetch CLI)** — a Node CLI that performs the same CRUD against the same JSON API, demonstrating plgg-fetch's typed `get`/`post`/`patch`/`del` surface.

The previous reorg attempt (`4e69f6f` / `01183ea`, since reset) was rejected because (a) `Article` has no behavior worth structuring, (b) names like "gallery" and "presentation" don't describe an app, and (c) the directory layout didn't follow a familiar convention. This ticket addresses all three by switching to a real domain *first* and letting the structure follow standard MVC vocabulary.

## Target Layout

```
src/example/src/
├── index.ts                       # library surface — re-exports models, view, controller types
├── server.ts                      # SSR Node entry — opens DB, builds controller, serves :3000
├── client.tsx                     # CSR browser entry — bundled to dist/client.js, handles UI events
├── cli.ts                         # plgg-fetch typed-client CLI — supports list/add/toggle/del
├── models/
│   ├── Todo.ts                    # Todo type + asTodo/asTodos + asNewTodo input decoder
│   ├── Todo.spec.ts               # caster tests
│   └── index.ts
├── db/
│   ├── open.ts                    # createTodosDb seeded + compactRow + insert/update/delete helpers
│   ├── open.spec.ts               # in-memory DB round-trip tests
│   └── index.ts
├── controller/
│   ├── app.ts                     # Web router with GET/POST/PATCH/DELETE + GET /client.js + GET /
│   ├── app.spec.ts                # integration tests over toFetch + real in-memory DB
│   └── index.ts
└── view/
    ├── App.tsx                    # the To-Do list view (header + form + list of TodoItem)
    ├── App.spec.tsx               # SSR/CSR isomorphism test
    ├── TodoItem.tsx               # one row: checkbox + title + delete button
    ├── TodoForm.tsx               # add-todo input + submit
    └── index.ts
```

**What lives at the root vs in MVC dirs:**

- The three runtime entries (`server.ts`, `client.tsx`, `cli.ts`) sit at the root because they're *wiring* — they compose model + view + controller + DB into a runnable program. MVC describes the *layered code*, not how it's launched.
- `index.ts` is the library re-export surface (consumers outside the package can `import { Todo, App } from "@plgg/example"`).
- The standalone plgg-view feature showcase (today's `src/view/{Greeting,Badge,Card,Menu,Notice}.tsx` + `view.spec.tsx`) is **moved out** to `src/plgg-view/example/` so the example package stays focused on the To-Do app. See Considerations below for the alternative.

## Domain Model

```ts
// models/Todo.ts
import {
  Option,
  Time,
  pipe,
  cast,
  forProp,
  forOptionProp,
  asString,
  asBoolean,
  asTime,
} from "plgg";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Time;
  completedAt: Option<Time>;
};

export const asTodo = (raw: unknown) =>
  pipe(
    cast(raw),
    forProp("id", asString),
    forProp("title", asString),
    forProp("completed", asBoolean),
    forProp("createdAt", asTime),
    forOptionProp("completedAt", asTime),
  );

export const asTodos = /* asArray(asTodo) */;

// Decoder for the POST /api/todos request body — title only; id/completed/timestamps server-generated.
export type NewTodo = { title: string };
export const asNewTodo = (raw: unknown) =>
  pipe(cast(raw), forProp("title", asString));
```

The raw wire shape matches the SQL row shape: `completed` is `0|1` in the row (decode to `boolean`), `completedAt` is nullable in SQL and `Option<Time>` in the domain. Same `compactRow` strip-NULLs pattern as today's `Article`.

## HTTP Routes

```
GET    /                # SSR HTML page (To-Do list, references /client.js)
GET    /client.js       # CSR bundle
GET    /api/todos       # list, returns Todo[]
POST   /api/todos       # body: NewTodo, returns the created Todo (201)
PATCH  /api/todos/:id   # body: { completed: boolean }, returns the updated Todo
DELETE /api/todos/:id   # returns 204
```

All routes are `proc` chains following the existing pattern: parse → validate → SQL → decode → respond. A single `mapErr(toHttpError)` at the edge folds `SqlError`/`InvalidError`/`NotFoundError` into the shared `HttpError` vocabulary. Body parsing for POST/PATCH uses plgg-server's existing JSON body helper (or adds one if missing — see Considerations).

## Key Files

**Files being created (new domain code):**

- `src/example/src/models/Todo.ts`, `models/Todo.spec.ts`, `models/index.ts`
- `src/example/src/db/open.ts` (rewrite from today's `db/open.ts` — todos table schema, seed data, helper queries), `db/open.spec.ts` (new — DB round-trip tests), `db/index.ts`
- `src/example/src/controller/app.ts` (rewrite from today's `server/app.ts` — five CRUD routes + the existing `/` and `/client.js`), `controller/app.spec.ts` (rewrite), `controller/index.ts`
- `src/example/src/view/App.tsx` (rewrite from today's root `App.tsx` — To-Do list shape), `view/App.spec.tsx` (rewrite), `view/TodoItem.tsx`, `view/TodoForm.tsx`, `view/index.ts`
- `src/example/src/server.ts` (rewrite from today's `ssr/server.ts` — same shape, uses new controller + new db)
- `src/example/src/client.tsx` (rewrite from today's `csr/client.tsx` — adds event handlers for add/toggle/delete, calls `/api/todos`)
- `src/example/src/cli.ts` (rewrite from today's `client/main.ts` — adds plgg-fetch `post`/`patch`/`del` calls and a tiny argv parser: `list`, `add <title>`, `toggle <id>`, `del <id>`)

**Files being deleted (old `Article` domain):**

- `src/example/src/App.tsx`, `App.spec.tsx` (replaced by `view/App.tsx`, `view/App.spec.tsx`)
- `src/example/src/modeling/Article.ts`, `modeling/index.ts`
- `src/example/src/db/open.ts` (rewritten in place; same path)
- `src/example/src/server/app.ts`, `server/app.spec.ts` (moved to controller/)
- `src/example/src/ssr/server.ts` (moved to root as `server.ts`)
- `src/example/src/csr/client.tsx` (moved to root as `client.tsx`)
- `src/example/src/client/main.ts` (moved to root as `cli.ts`)

**Files being modified (not moved):**

- `src/example/package.json` — scripts: `"serve": "tsx src/server.ts"`, `"cli": "tsx src/cli.ts"` (renamed from `"client"`). Description prose updates from "Article" framing to "a To-Do CRUD app".
- `src/example/vite.config.ts` — `lib.entry: "src/client.tsx"` (was `"src/csr/client.tsx"`).
- `src/example/src/index.ts` — re-exports flip: `export * from "./models"; export * from "./view"; export * from "./controller";`. Comment updates ("the server/client/cli entries are excluded — they run, they aren't imported").
- `src/example/README.md` — rewritten around the To-Do app and the MVC layout.

**Files being relocated (out of this package):**

- `src/example/src/view/{Greeting,Badge,Card,Menu,Notice}.tsx` + `view.spec.tsx` → `src/plgg-view/example/{Greeting,Badge,Card,Menu,Notice}.tsx` + a single `example.spec.tsx`. These are plgg-view feature demos, not part of the To-Do app; they belong with plgg-view. The current `src/plgg-view/example.tsx` is a single-file demo and can be replaced/augmented by these. Confirm during `/drive` whether to move (recommended) or delete the gallery; do not leave it in `src/example/`.

## Related History

- [20260528091347-fullstack-example-combining-view-sql-http-client.md](.workaholic/tickets/archive/work-20260528-011843/20260528091347-fullstack-example-combining-view-sql-http-client.md) — Built the current `Article`-based example. The seam invariants its Final Report captured (raw-row wire shape so `Option`/`Time` survive JSON, `asArticle` decode-at-boundary, browser-safe subpath imports, single `mapErr` at the server edge) carry over to the To-Do app: replace `Article` with `Todo` and the same invariants apply.
- [20260528193320-rename-plgg-http-router-to-plgg-server.md](.workaholic/tickets/archive/work-20260528-143038/20260528193320-rename-plgg-http-router-to-plgg-server.md) and [20260528193321-rename-plgg-http-client-to-plgg-fetch.md](.workaholic/tickets/archive/work-20260528-143038/20260528193321-rename-plgg-http-client-to-plgg-fetch.md) — Establish the current package names: imports come from `plgg-server`, `plgg-server/client`, `plgg-fetch`.
- [20260226053744-make-comprehensive-readme.md](.workaholic/tickets/archive/drive-20260226-032733/20260226053744-make-comprehensive-readme.md) — Single-example-package policy. The rewrite stays inside `src/example/`; only the standalone plgg-view feature demos move OUT to `src/plgg-view/example/`.
- [20260527142355-create-plgg-view-presentation-layer.md](.workaholic/tickets/archive/plgg-view/20260527142355-create-plgg-view-presentation-layer.md) — The plgg-view tsconfig setup (`jsxImportSource: "plgg-view"`) carries over; no edits.
- A previous attempt (`4e69f6f` / `01183ea`) reorganized the existing `Article` example into a `presentation/` + `gallery/` layout. That work was reset to `65bfa55` because (a) `Article` is too abstract to motivate a meaningful structure and (b) the names didn't reflect a real app. Insights from that attempt that still apply: `presentation/ssr.ts`'s `__dirname` math is depth-sensitive (`server.ts` at the root means `join(__dirname, "..", "dist", "client.js")` — one `..`, not two); `sh/check-all.sh` does NOT exercise the bundle-readFileSync path, so a manual `npm run serve` smoke test is mandatory after touching the SSR entry.

## Implementation Steps

The rewrite is one large coherent change. Land it as a single commit so the package is never half-converted.

1. **Move the standalone plgg-view feature demos out**:
   - `git mv src/example/src/view/{Greeting,Badge,Card,Menu,Notice}.tsx src/plgg-view/example/` (creating the directory; this may also subsume the existing `src/plgg-view/example.tsx`).
   - `git mv src/example/src/view/view.spec.tsx src/plgg-view/example/example.spec.tsx`.
   - `git rm src/example/src/view/index.ts` (no longer needed).
   - `rmdir src/example/src/view`.
   - Update `src/plgg-view/example/`'s imports if needed; verify `sh/test-plgg-view.sh` still passes.

2. **Create the MVC directory skeleton** under `src/example/src/`: `models/`, `db/`, `controller/`, `view/` (now fresh — empty).

3. **Write `models/Todo.ts`** — `Todo` type, `asTodo`/`asTodos` casters, `NewTodo` type, `asNewTodo` input caster. Add `models/Todo.spec.ts` covering success cases, missing-field failures, type-mismatch failures, and `completedAt` Option None branch. Add `models/index.ts` re-exporting Todo + casters.

4. **Rewrite `db/open.ts`** for the To-Do schema:
   - Schema: `CREATE TABLE todos (id TEXT PK, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL, completedAt TEXT)`.
   - Seed three todos (one completed, one open with a long title, one freshly-created).
   - Keep `compactRow` (strip NULL keys so `completedAt` decodes to `Option None`).
   - Export `createTodosDb`, the plgg-sql `Db` adapter, and SQL strings: `LIST_TODOS_SQL`, `INSERT_TODO_SQL`, `UPDATE_TODO_COMPLETED_SQL`, `DELETE_TODO_SQL`, `GET_TODO_BY_ID_SQL`. (Whether to expose SQL strings or wrapped query functions is a style choice; the existing `Article` example exposes the SQL string — follow that convention.)
   - Add `db/open.spec.ts`: seed + list + insert + toggle + delete round-trip; confirm `completedAt` is `null` after delete-of-not-found and `Option Some` after toggle.
   - Add `db/index.ts` barrel.

5. **Rewrite `controller/app.ts`** with the five new routes plus the existing `/` and `/client.js`:
   - `GET /api/todos` — `proc(LIST_TODOS_SQL, query(db), compactRow, decodeRows(asTodo), jsonResponse)`.
   - `POST /api/todos` — read the JSON body (`HttpRequest` helper from plgg-server; if none exists, add one in this ticket and flag — see Considerations), `asNewTodo` decode, generate `id`+`createdAt`, `INSERT_TODO_SQL`, return 201 + the created Todo as JSON.
   - `PATCH /api/todos/:id` — extract `:id` param, read body `{ completed: boolean }`, `UPDATE_TODO_COMPLETED_SQL` (also sets `completedAt` to now when `completed=true`, `null` when `false`), return the updated Todo.
   - `DELETE /api/todos/:id` — `DELETE_TODO_SQL`, return 204. If row not found, 404.
   - `GET /` — SSR page passing the current todos list to `<App />`.
   - `GET /client.js` — return the bundle.
   - All routes route errors through a single `mapErr(toHttpError)` at the route edge.
   - Add `controller/app.spec.ts` with integration tests over `toFetch` and a real in-memory seeded DB: list, create, toggle, delete, missing-id 404, malformed-body 400.
   - Add `controller/index.ts` barrel exporting `buildApp`.

6. **Rewrite `view/App.tsx`** with the To-Do UI: a header, a `TodoForm` (text input + submit), and a `<ul>` of `<TodoItem>` (checkbox + title + delete button). The component is data-driven (`{ todos: ReadonlyArray<Todo> }`); CSR-side event handlers live in `client.tsx`. Add `view/TodoItem.tsx` and `view/TodoForm.tsx` as separate components. Add `view/App.spec.tsx` proving SSR + CSR produce the same DOM from the same `asTodos`-decoded data. Add `view/index.ts` barrel.

7. **Rewrite the three runtime entries at the root**:
   - `server.ts` — `createTodosDb()` → `readFileSync(join(__dirname, "..", "dist", "client.js"))` (**one** `..`, since `server.ts` is at depth 1 below `src/`) → `pipe(buildApp(db, bundle), toFetch, serve({ port: 3000 }))`.
   - `client.tsx` — on `DOMContentLoaded`, fetch `/api/todos`, decode with `asTodos`, render with `plgg-server/client`'s `render`. Wire event handlers on the rendered DOM: submit `TodoForm` → POST → re-fetch + re-render; toggle checkbox → PATCH → re-fetch + re-render; delete button → DELETE → re-fetch + re-render. Keep native browser `fetch` here so `node:http` stays out of the bundle.
   - `cli.ts` — tiny argv parser (`process.argv[2]` switch on `list` / `add` / `toggle` / `del`), uses `plgg-fetch`'s `get`/`post`/`patch`/`del` with `decodeJsonBody(asTodo[s])` and the existing `match(ClientError)` fold. Prints output via `console.log`. The CLI is a real demo: `npm run cli -- add "Buy milk"`.

8. **Update `src/example/src/index.ts`** — `export * from "./models"; export * from "./view"; export * from "./controller";`. Comment updates to "the server, client, and cli entries are excluded — they run, they aren't imported".

9. **Update `src/example/package.json`** — `"serve": "tsx src/server.ts"`, `"cli": "tsx src/cli.ts"` (renamed from `"client"`). Description: "A To-Do app demo for the plgg monorepo — classic MVC, SSR + CSR + plgg-fetch CLI over plgg-server, plgg-sql, plgg-view, plgg-fetch."

10. **Update `src/example/vite.config.ts`** — `lib.entry: "src/client.tsx"`.

11. **Rewrite `src/example/README.md`** — frame the package as "a To-Do app, classic MVC". Table by directory: models, db, controller, view, plus the three root entries. Run instructions for `npm run serve`, `npm run cli -- add "x"`, etc. JSX-config note links to `src/plgg-view/README.md`.

12. **Regenerate `package-lock.json`** in `src/example/` if the dependency tree changed (it shouldn't; same packages, just internal restructure).

13. **Verify**:
   - `grep -rn "Article\|articles\|modeling\|src/example/src/csr\|src/example/src/ssr\|src/example/src/client\|src/example/src/server\|src/example/src/db/open\|src/example/src/view/Greeting" src sh README.md` → zero hits in live code (excluding `.workaholic/`).
   - `cd src/example && npm run tsc` → green.
   - `sh/check-all.sh` → full suite green; example has new tests (Todo decoder, DB round-trip, controller integration, App isomorphism).
   - **Manual smoke test (mandatory)**: `npm run build` → `dist/client.js` produced. `npm run serve` → "listening on http://localhost:3000". `curl localhost:3000/` shows the seeded To-Do list as HTML. `curl localhost:3000/api/todos` returns JSON. In a browser at `:3000`: form adds, checkbox toggles, delete button removes — view updates after each. `npm run cli` shows the list; `npm run cli -- add "test"` adds; `npm run cli -- toggle <id>` toggles; `npm run cli -- del <id>` deletes.

## Considerations

- **Plgg-server body parsing.** The existing example only does GETs, so JSON body parsing on `HttpRequest` may not yet have a helper. Check `plgg-server`'s exports for something like `decodeJsonBody`/`bodyJson` (`src/plgg-server/src/Http/usecase/*`). If absent, add a small `bodyJson(asNewTodo)` helper inside the controller for now (this ticket) and flag it as a candidate to upstream into plgg-server proper in a follow-up. Do NOT export raw `node:http` API.
- **CRUD scope.** Full CRUD (list, create, toggle, delete) is recommended because anything less reads as a fake demo. If the user wants to ship in two passes, the natural split is: ticket #1 reads only (replaces `Article` with `Todo`, MVC layout, GET-only routes — closest to the current behavior); ticket #2 adds POST/PATCH/DELETE + CSR event handlers + CLI CRUD. Recommend keeping it as one ticket.
- **Gallery destination.** Moving `src/example/src/view/{Greeting,Badge,...}.tsx` to `src/plgg-view/example/` aligns plgg-view's package with the per-library convention used by `plgg-server/example.ts`, `plgg-fetch/example.ts`, `plgg-sql/example.ts`. The existing `src/plgg-view/example.tsx` (single file) can be replaced or merged. Alternative: delete the gallery entirely if you decide it's not useful — but it IS the only documentation of those plgg-view JSX features.
- **No `as`/`any`/`@ts-ignore`** per `CLAUDE.md`. The PATCH/DELETE handlers need to extract `:id` from the route; use plgg-server's typed route param helper, not a cast.
- **`__dirname` math in `server.ts`.** Because `server.ts` sits at `src/example/src/` (depth 1), the path to `dist/client.js` is `join(__dirname, "..", "dist", "client.js")` — ONE `..`, not two. The previous reorg attempt got this right by accident under a `presentation/` grouping (depth 2); this layout makes it depth 1, so the math changes. The `sh/check-all.sh` test suite does NOT exercise this `readFileSync`; manual `npm run serve` is the only catch.
- **Atomicity.** Land the whole rewrite as one commit. A half-converted state (some files moved, some imports stale) is harder to reason about than a clean before/after.
- **`.workaholic/` append-only.** Archived tickets, stories, and release-notes that mention `Article`, `src/example/src/csr/client.tsx`, etc. are preserved verbatim. Verification grep is scoped to live code only.
- **Single-example-package policy.** Per `.workaholic/policies/`, the To-Do app stays inside `src/example/`. The plgg-view gallery moves to `src/plgg-view/example/` because those demos belong to plgg-view, not because we're creating a new example package.
- **Naming for the plgg-fetch CLI demo.** `cli.ts` was chosen because the file IS a Node CLI tool (with subcommands), and "CLI" describes its real-world category. Alternative `fetch.ts` (naming the library it demos) is also defensible. The previous attempt's `fetch.ts` was rejected as too abstract; `cli.ts` is more concrete. Confirm during `/drive` if you prefer one over the other (`src/example/src/cli.ts`).
- **Test coverage.** The rewrite ADDS spec files (`models/Todo.spec.ts`, `db/open.spec.ts`, expanded `controller/app.spec.ts`). The project floor is ≥90% per `.workaholic/constraints/quality.md`; the new code should exceed that, not regress it.

## Discussion

### Revision 1 - 2026-05-28T21:35:00+09:00

**User feedback**: At /drive kickoff the user rejected the separate plgg-fetch CLI demo: *"I don't get why you stick with this file. I don't need a CLI; I want you to use the plgg-fetch library in the client-side (CSR, client-side rendering) version."* The other two decisions confirmed: full CRUD; move the plgg-view feature demos to `src/plgg-view/example/`.

**Ticket updates**:

- **Drop `cli.ts` entirely.** No third runtime entry, no separate plgg-fetch demo script. The package has TWO runtime entries: `server.ts` (Node SSR) and `client.tsx` (browser CSR).
- **`client.tsx` uses `plgg-fetch`** for all `/api/todos` calls (list refresh, POST create, PATCH toggle, DELETE) — not native browser `fetch`. plgg-fetch's typed surface (`get`/`post`/`patch`/`del` + `decodeJsonBody(asTodo[s])` + `match(ClientError)`) is exercised by the actual app, not by an orphan demo script.
- **package.json scripts**: only `serve` and `build` (and the standard tsc/test/coverage); drop the `client`/`cli`/`fetch` script.
- **Implementation Steps**: step 7 collapses from three entries to two; step 9 drops the `cli` script line; step 11 (README) frames it as "**SSR + CSR-with-plgg-fetch**", not "three patterns". Steps 1–6 (gallery move, models, db, controller, view) are unchanged.

**Direction change**: The previous design (native browser fetch + Node CLI demo) over-separated the two HTTP-client concerns to demonstrate them in isolation. The new design weaves plgg-fetch into the real app — so its typed-client surface and `ClientError` fold are used for the same calls the user would make in any real SPA. The "three patterns" the user originally listed (SPA, SSR, Ajax) are still all present, but they collapse into two runtime entries: `server.ts` (SSR) and `client.tsx` (SPA hydration + Ajax via plgg-fetch).

**Architectural consideration that emerges from this change.** `client.tsx` now imports from `plgg-fetch`, which imports `HttpError` types from `plgg-server`. The example's vite browser bundle therefore drags `plgg-server`'s main entry into the browser — including the `serve`/`toFetch` functions that import `node:http`. The current `csr/client.tsx` avoided this by using native browser `fetch` and importing only from `plgg-server/client` (the browser-safe subpath). After this change, the example's vite.config.ts may need `rollupOptions.external: [/^node:/]` (or plgg-server may need `"sideEffects": false` so the bundler can tree-shake the node-only code, or plgg-fetch may need to import HttpError from a browser-safe subpath of plgg-server). **The implementation step "build and serve" is the early-warning: if `npm run build` fails with a `node:http` resolution error, that's the trigger to address the bundling architecture in this same ticket (or split into a prerequisite ticket if the fix is non-trivial).**

## Final Report

Development completed with three meaningful departures from the original plan, all confirmed during implementation.

1. **Dropped `cli.ts` entirely.** At /drive kickoff the user rejected the separate plgg-fetch CLI demo (*"I don't get why you stick with this file"*) and asked for plgg-fetch to drive the CSR-side Ajax calls instead. The package ended with TWO runtime entries (`server.ts`, `client.tsx`) instead of three. The "Ajax API handling pattern" the user originally listed is demonstrated INSIDE the SPA, not in an orphan script — which is what a real-world plgg-fetch consumer would actually look like.
2. **Replaced 204 No Content with 200 + `{deleted: id}` for DELETE.** plgg-server's `toFetch` builds the native `Response` by passing the body string (`""`) directly to the constructor, which the Fetch spec rejects for null-body statuses (204/205/304). Working around this in the controller would have meant adding a sentinel/branching in `toNativeResponse`; out of scope for this ticket. A `200 OK` with a small confirmation body is RESTful enough and lets the CSR side handle success uniformly with the other mutations.
3. **The `node:http` bundling concern flagged in the Discussion did NOT materialize as a blocker.** Vite + rollup tree-shook `serve`/`toFetch` out of the browser bundle (verified with `grep` against `dist/client.js`); the only "node:http externalized" message was a build-time warning, not a runtime error. No changes to plgg-server, plgg-fetch, or `vite.config.ts` were needed.

The CRUD smoke test (`curl` against a running `npm run serve`) confirmed all six routes work end-to-end: SSR HTML page, JSON list, POST (with server-generated UUID and ISO timestamps), PATCH toggle (setting/clearing `completedAt`), DELETE with `{deleted: id}` confirmation. The full `sh/check-all.sh` suite passes with 656 tests (up from 633 — net +23 after redistributing the gallery from the example to plgg-view and adding 22 new example specs across `models/`, `db/`, `controller/`, and `view/`).

### Discovered Insights

- **Insight**: The wire shape for a value with an `Option`-typed field must OMIT the key when `None`, not emit `null`. `forOptionProp` reads a present-but-`null` value as a failed cast (it tries the predicate on `null`), only an absent key decodes to `None`. The pattern `compactRow` establishes server-side (strip null keys from the SQL row) must be applied to the JSON wire shape too — either by re-using `compactRow` on the output, or by structurally omitting the key (the approach taken in `controller/app.ts`'s `toWireTodo`). Naive JSON serialization of `Option` (e.g. `completedAt: matchOption(() => null, ...)`) fails the consumer's decode.
  **Context**: A trap that lives at every plgg-server ↔ plgg-fetch boundary that carries an `Option`. Worth a one-liner in `plgg-fetch`'s README or `decodeJsonBody` doc — the symmetric server/client contract IS that the key is absent when `None`, not that it's null.
- **Insight**: plgg-server has no `noContent`/`204` response helper, and `toNativeResponse` can't produce a null-body native `Response` (it always passes `body` to the constructor). Returning a `204 No Content` from a route fails at the seam with `TypeError: Response constructor: Invalid response status code 204`. The pragmatic workaround in this ticket was to return `200 + {deleted: id}`; the principled fix would be a `noContent()` helper in plgg-server that yields a `HttpResponse` whose body the seam translates to `null` (or omits) when the status mandates it.
  **Context**: Filing as carry-over for plgg-server. RESTful DELETE 204 should not require the consumer to invent a workaround in every route.
- **Insight**: `proc`'s error type is fixed at `Error` (`Promise<Result<T, Error>>`). That makes `proc` ergonomic on the server side (where SQL/decode failures ARE `Error` subclasses) but unusable on the client side, because plgg-fetch's `ClientError` is a plgg `Box` union, not an `Error`. The canonical client-side pattern (per `plgg-fetch/example.ts`) is `pipe(await get(url), matchResult(onErr, onOk))` — direct promise chaining instead of `proc`. Trying to thread `ClientError` through `proc` produces a wall of "ClientError not assignable to Error" diagnostics.
  **Context**: Worth surfacing in plgg-fetch's README: "Use `pipe + matchResult`, not `proc`, when chaining plgg-fetch calls — `proc`'s error type is `Error`, plgg-fetch's is `ClientError`." Several minutes of TS-error spelunking went into rediscovering this.
- **Insight**: A "real-app demo" reads completely differently from an "abstract-pattern showcase". The previous attempt (`Article` with three rows + one read route) couldn't motivate a meaningful directory structure — there was nothing for the layers to organize. Switching to a To-Do CRUD app made the MVC layout self-evident: `models/Todo.ts` IS the domain, `db/open.ts` IS the persistence seam, `controller/app.ts` IS the HTTP surface, `view/{App,TodoItem,TodoForm}.tsx` IS the presentation. The structure follows from the work; abstract examples are structure-resistant.
  **Context**: Future examples should start from a recognizable app (To-Do, blog, calendar, timer, …), not abstract domain shapes. The first question in a /ticket conversation about a new example should be "what real app does this demonstrate?" — the layout question answers itself afterward.
- **Insight**: TypeScript's `matchOption` inference fails silently when both branches don't have explicit return types and the some-branch parameter has no annotation. The error reports `'t' is of type 'unknown'` (rather than something clearer like "couldn't unify R"), and the fix is `matchOption((): T => ..., (x: U): T => ...)` — explicit types on both lambdas. Likely an `R` unification limit when the some-branch's parameter must be inferred from the surrounding `Option<U>`.
  **Context**: When you see a `matchOption` error referencing `unknown`, the fix is annotations on BOTH branches' parameters and return types — not just one.
