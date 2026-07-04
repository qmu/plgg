---
created_at: 2026-07-04T14:30:16+09:00
author: a@qmu.jp
type: enhancement
layer: [DB, Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260704143014-plggpress-serve-mode-dual-config.md, 20260704143015-plgg-sql-fts5-support.md, 20260704143017-frontmatter-yaml-subset-and-content-models.md]
---

# `plgg-content`: a derived, rebuildable SQLite index over the git-primary Markdown corpus, with a MicroCMS-like read-only JSON delivery API and an FTS5 search endpoint

## Overview

Phase 5 (Server & data), ticket **16** of the plggpress/plggmatic roadmap —
the phase's capstone, cashing in tickets **14** (served instance + mount
seam), **15** (plgg-sql FTS5 vocabulary), and **17** (frontmatter parser +
caster-backed content models) into the two things the CMS vision needs on the
served side: **a queryable content index** and **a MicroCMS-like delivery
API**. Decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

The governing decision is **D4**, transcribed here so an implementer need not
open the spec: *"Content source of truth — **Git/filesystem primary, SQLite is
a derived, rebuildable index.** RAG, search, requests/comments live DB-only.
Revisit SQLite-primary only when guest web editing of articles ships."* Every
byte in the index is reconstructable from the Markdown corpus; losing the
database costs nothing but a rebuild. This ticket therefore treats **full,
idempotent rebuild** as the primary operation and **incremental re-index on
change** as an optimization over it — never the other way around.

Two more decisions frame the delivery surface. From the vision (author's
words): plggpress adds *"a MicroCMS-like delivery API enabling SPA consumers …
typed custom content models (user-defined attributes)."* And **D17**: the
Claude Code plugin export ships *"skills generated from content structure"* and
an MCP server pointed at the instance — so the query API must be **callable
in-process as plain typed functions**, not only over HTTP: the same
`listCollection`/`getDocument`/`searchIndex` functions back the SPA delivery
API (this ticket), the admin UI (ticket 20), the MCP tools (tickets 26/27),
and the plugin export (ticket 30). The HTTP layer is a thin adapter over them.

Why a **new package, `plgg-content`**, rather than folding this into plggpress:
the delivery API and the index outlive the SSG and are consumed by callers
that must not drag in plggpress's CLI, theme, or `plgg-bundle` toolchain (the
MCP server and the exported plugin especially). Keeping the index/query core
in its own package also keeps a **dependency cycle** from forming — plggpress
depends on `plgg-content` (to mount `/api`), so `plgg-content` must not depend
back on plggpress. It therefore stays HTTP-agnostic and plggpress-agnostic:
plggpress does the ticket-17 `ContentModel` validation and hands `plgg-content`
**already-validated, serialized** collection schemas and document attributes as
plain data; `plgg-content` stores and serves them, and knows nothing of
`SiteConfig`. The HTTP surface (`GET /api/*`, the search endpoint) is a
`plgg-server` `Web` sub-app built **in plggpress** and mounted at the
`pressServeWeb` seam ticket 14 established (`route("/api", …)`), using
`plgg-http`'s `jsonResponse`.

Scope guardrails (siblings own the rest): the FTS5 SQL vocabulary is **ticket
15's** deliverable — this ticket *consumes* `createFts5Table`/`fts5Match`/
`bm25Rank`/`fts5Phrase`/`fts5Rebuild`/`fts5SyncTriggers`/`SqlIdent` and must
**not** string-assemble FTS5 SQL (if it needs a fragment ticket 15 lacks,
extend ticket 15's module — the revisit trigger it names). The frontmatter
parser, the `YamlMap`, the `ContentModel`/`casterOf`/`ContentModelBinding`, and
the build-time `checkModels` pass are **ticket 17's**; this ticket consumes the
validated output. Auth/authorization on `/api` and `/admin` is **tickets
19/20** — the delivery API here is **read-only and public** (GET only), the
same content the SSG already publishes, so it needs no authz yet (state that
explicitly in the mount docstring so a later ticket adds the guard at the
seam). Opt-in embeddings / cosine top-k are **ticket 24**, layered on the same
`chunks` table this ticket lays down. This is the always-on FTS5 baseline of
**D11** (*"always-on baseline = SQLite FTS5 (BM25) … graceful degradation
without an API key"*): search works with **no** LLM key configured.

The Phase 5 gate this ticket must satisfy (from the spec): *"FTS5 search
returns sane results on the real guide corpus"* — and the byte-identity gate
(*"dual-mode must not change static output"*) is respected trivially here
because the index and API are served-only; `plggpress build` and its rendered
bytes are untouched.

## Policies

- `workaholic:operation` / `policies/delivery.md` — this ticket adds a **new
  publishable package** and a **second, dynamic delivery path** for the same
  content. The policy documents that `scripts/build.sh` runs per-package
  `npm run build` in dependency order and *"is publish-order authority"*
  (publish order is sed-derived from it), and that `scripts/npm-install.sh`
  installs each package in order — so introducing `plgg-content` requires exact
  `cd $REPO_ROOT/packages/plgg-content && npm run build` / `npm install` lines
  placed **before plggpress** and after `plgg-sql`/`plgg-db-migration` (which
  must themselves move ahead of plggpress — see Implementation Steps §1), plus
  a `test-plgg-content.sh` line in `check-all.sh`.
- `workaholic:implementation` / `policies/recovery.md` — D4 is a
  recoverability decision: the index is *derived and rebuildable*, so the
  system must **self-heal by rebuild**. The ingest pipeline must be idempotent
  (running it twice yields the same rows), a corrupt/absent DB must be
  reconstructable from the corpus in one operation, and every ingest write
  must be transactional (partial index states are never observable) — the
  policy's "keep serving / recover" discipline applied to the content index.
- `workaholic:design` / `policies/security.md` — the delivery API answers
  **unauthenticated public GETs** and its query parameters (`limit`, `offset`,
  `q`, `orderBy`) are untrusted input. `limit`/`offset` must be parsed with
  plgg casters into bounded numbers (Err on garbage, hard cap on `limit` so a
  visitor can't request the whole corpus in one call), the free-text `q` must
  reach FTS5 only through ticket 15's `fts5Phrase` sanitizer (crash-safe, never
  a raw `MATCH`), and `orderBy` must be constrained to a **closed union** of
  known columns (never an interpolated identifier) — injection-safe and
  crash-safe by construction, matching plgg-sql's own posture.
- `workaholic:implementation` / `policies/test.md` — the 90% four-metric
  coverage doctrine and the "test against the real engine" practice: index and
  search specs run against real `node:sqlite` (Node ≥22.6, the accepted driver
  surface) through plgg-sql's `Db` seam, mirroring the plgg-sql /
  plgg-db-migration / plgg-auth testkits. The new package is gated **≥90 from
  day one** (D14; ticket 02 makes the gate load-bearing — a missing
  `plgg-test.config.json` must not silently skip gating).

## Key Files

- `packages/plgg-content/` — **new** package (`package.json`, `tsconfig.json`,
  `plgg-test.config.json`, `README.md`, `index.ts`, `example.ts`), laid out in
  the `model/`/`usecase/` domain shape the plgg family uses (see `plgg-sql`,
  `plgg-md`). Its `exports` map must carry **`types` + `default`** under
  `import` from day one (concern **51**:
  `.workaholic/concerns/51-plggpress-exports-map-is-import-only.md` — plggpress
  shipped import-only and a future `require()` would break; do not repeat that
  for a package the MCP/plugin consumers will `require()`).
- `packages/plgg-content/src/Ingest/` — the pipeline: `usecase/chunkBlocks.ts`
  (heading-scoped chunking over the plgg-md `Block` AST),
  `usecase/indexDocument.ts`, `usecase/rebuildIndex.ts`,
  `usecase/syncDocument.ts` (incremental), `model/Document.ts`,
  `model/Chunk.ts`.
- `packages/plgg-content/src/Schema/` — `usecase/contentMigrations.ts` (the
  index DDL as plgg-db-migration migration bodies) and
  `usecase/openIndex.ts` (open a `Db`, run `migrateUp`, ready for ingest).
- `packages/plgg-content/src/Query/` — the HTTP-agnostic read API:
  `model/CollectionSchema.ts`, `model/ListQuery.ts` (limit/offset/orderBy/q),
  `usecase/listCollection.ts`, `usecase/getDocument.ts`,
  `usecase/searchIndex.ts`, `usecase/listCollections.ts`.
- `packages/plgg-md/src/Block/model/Block.ts` — the `Block` `Box` union
  (`Heading` with `HeadingLevel 1..6`, `Para`, `CodeFence`, `List`, `Quote`,
  `Table`, `Callout`, `ThematicBreak`) the chunker folds with exhaustive
  `match`; `packages/plgg-md/src/Block/usecase/parseBlocks.ts` and
  `src/Render/usecase/renderMarkdown.ts` (`parseBlocks`, `renderMarkdown`) are
  the producers ingest reads. Consumed, not modified.
- `packages/plgg-sql/src/Fts5/` — ticket 15's new FTS5 domain
  (`createFts5Table`, `fts5Match`, `bm25Rank`, `fts5Phrase`, `fts5Rebuild`,
  `fts5SyncTriggers`, `SqlIdent`/`identSql`). The **only** way this ticket
  emits FTS5 SQL. Consumed, not modified.
- `packages/plgg-db-migration/src/domain/usecase/migrateUp.ts` +
  `src/testkit/migrator.ts`, `src/testkit/sqliteDb.ts` — the migrator this
  ticket runs the index schema through, and the harness ticket 15 already
  proved passes FTS5 DDL/trigger bodies verbatim. Consumed, not modified.
- `packages/plgg-sql/example.ts` — the `node:sqlite` `DatabaseSync` `open`
  seam to mirror for `openIndex` and the spec harness.
- `packages/plggpress/src/server/pressServer.ts` — ticket 14's mount seam
  (`pressServeWeb`); this ticket adds the `route("/api", deliveryApi(...))`
  mount here and nowhere else (the seam's stated purpose — if it lands
  elsewhere the seam failed, per ticket 14's revisit trigger).
- `packages/plggpress/src/DeliveryApi/` — **new in plggpress**:
  `usecase/deliveryApi.ts` (the `plgg-server` `Web` sub-app wiring
  `plgg-content`'s query functions to `GET` routes via `jsonResponse`),
  `usecase/toCollectionSchema.ts` (map ticket-17 `ContentModel` →
  `plgg-content` `CollectionSchema`), `usecase/ingestFromConfig.ts` (discover
  paths → parse+validate via ticket 17 → feed `plgg-content` ingest).
- `packages/plgg-http/src/Http/model/HttpResponse.ts` — `jsonResponse` (line
  91) the delivery routes return; `packages/plgg-http/src/Http/model/HttpRequest.ts`
  — `getQuery` (line 65) the query-param reader. Consumed, not modified.
- `packages/plgg-server/src/Routing/model/Web.ts` — `route(basePath, sub)`,
  `get`, the `Web` combinators the sub-app is built from. Consumed, not
  modified.
- `packages/plggpress/src/SiteConfig/model/SiteConfig.ts` — ticket 17's
  optional `models` field is the source `toCollectionSchema` reads.
- `scripts/build.sh`, `scripts/npm-install.sh`, `scripts/check-all.sh`,
  `scripts/test-plgg-content.sh` (**new**) — the wiring (§1).

## Related History

- **Direct dependencies (this branch):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143014-plggpress-serve-mode-dual-config.md`
  delivers the persistent served instance and the `pressServeWeb` mount seam
  — this ticket is the **first real mount** on it (ticket 14 names that as its
  success test).
  `.workaholic/tickets/todo/a-qmu-jp/20260704143015-plgg-sql-fts5-support.md`
  delivers the typed FTS5 builders and the `SqlIdent`/`identSql` guarded
  identifier path — this ticket is their first consumer, and ticket 15's own
  Considerations flag *"if ticket 16 finds itself string-assembling any FTS5
  SQL, the vocabulary here is incomplete — extend that module."*
  `.workaholic/tickets/todo/a-qmu-jp/20260704143017-frontmatter-yaml-subset-and-content-models.md`
  delivers the parsed `Frontmatter.data: Option<YamlMap>`, `foldYaml`, and the
  declarative `ContentModel`/`casterOf`/`ContentModelBinding` — this ticket
  serves the validated attributes and the serialized schema (ticket 17's
  Considerations: *"Delivery/introspection is ticket 16's half"*).
- `.workaholic/tickets/archive/work-20260627-205005/20260627210146-scaffold-plgg-db-migration-package.md`
  and `…/20260627210145-plgg-sql-execscript-seam.md` (story
  `.workaholic/stories/work-20260627-205005.md`) — the migration engine and
  trusted-script path the index schema rides on.
- `.workaholic/stories/plgg-sql.md` and
  `.workaholic/tickets/archive/plgg-sql/20260527142355-create-plgg-sql-builder.md`
  — plgg-sql's founding identity (*"not an ORM, not a query-builder AST"*):
  `plgg-content` speaks it as pipeline steps (`sql`/`query`/`transaction`/
  `decodeRows`), never a new query language.
- `.workaholic/tickets/archive/work-20260617-002003/20260617001953-ssg-static-site-generation.md`
  — the SSG core and `discoverPaths`/`pressRouter` render path (`Block` AST →
  HTML) that ingest re-reads to build the index; the delivery API is that same
  corpus exposed as data instead of pages.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (story `.workaholic/stories/work-20260703-184443.md`) — established
  plggpress's current direct-deps + `framework/` seam layout this ticket adds
  `DeliveryApi/` beside without disturbing.
- **Concern 51** (`.workaholic/concerns/51-plggpress-exports-map-is-import-only.md`)
  — the require()-compat export-map lesson `plgg-content` must honor from
  birth. **Sibling ticket 02** (`…143002-harden-coverage-gate-defaults.md`)
  makes the ≥90 gate load-bearing — assume enforcement.

**Wiring note (load-bearing):** `plgg-content` depends on `plgg`, `plgg-md`,
`plgg-sql`, and `plgg-db-migration`; plggpress will depend on `plgg-content`.
Today `scripts/build.sh` builds `plgg-sql` (line 50) and `plgg-db-migration`
(line 53) **after** plggpress (line 47) — so those two, plus the new
`plgg-content`, must be reordered to build **before** plggpress. This is the
publish-order-authoritative change the delivery policy anticipates; get the
exact `cd`-line format right (`cd $REPO_ROOT/packages/<name> && npm run build`).

## Implementation Steps

1. **Scaffold and wire the package.** Create `packages/plgg-content` in the
   plgg house layout (mirror `plgg-sql`: `package.json` with
   `"type": "module"`, `file:` deps on `plgg`/`plgg-md`/`plgg-sql`/
   `plgg-db-migration`, `plgg-bundle`+`plgg-test` dev-deps, the standard
   `build`/`test`/`coverage` scripts; `tsconfig.json` with the self-alias
   `paths`; `plgg-test.config.json` with a **≥90** four-metric threshold;
   `bin/hook.mjs` copied from a sibling if the toolchain requires it). Its
   `exports` map must include **`types` + `default`** under `import` (concern
   51). Then wire the runner scripts with **exact** `cd`-lines:
   - `scripts/npm-install.sh`: move `plgg-sql` and `plgg-db-migration` above
     the plggpress line and insert
     `cd $REPO_ROOT/packages/plgg-content && npm install` before plggpress.
   - `scripts/build.sh`: move the `plgg-sql`/`plgg-db-migration`
     `cd … && npm run build` lines above plggpress and insert
     `cd $REPO_ROOT/packages/plgg-content && npm run build` before plggpress
     (dependency order: plgg → plgg-md → plgg-sql → plgg-db-migration →
     plgg-content → plggpress). Verify no other line's ordering breaks
     (nothing else depends on plgg-sql/db-migration before their old
     position).
   - `scripts/check-all.sh`: add `./scripts/test-plgg-content.sh` and create
     that script mirroring `scripts/test-plgg-sql.sh`.
   - Add `plgg-content` to plggpress's `dependencies` in
     `packages/plggpress/package.json`.
2. **Index schema** (`src/Schema/usecase/contentMigrations.ts`): author the
   DDL as plgg-db-migration `-- migrate:up/down` migration bodies (verbatim
   through `execScript`, the path ticket 15 proved carries FTS5 bodies):
   - `documents(id INTEGER PRIMARY KEY, collection TEXT NOT NULL,
     path TEXT NOT NULL UNIQUE, title TEXT, content_hash TEXT NOT NULL,
     attributes_json TEXT NOT NULL, updated_at TEXT NOT NULL)` — one row per
     page; `attributes_json` is the ticket-17-validated typed frontmatter,
     serialized.
   - `chunks(id INTEGER PRIMARY KEY, document_id INTEGER NOT NULL REFERENCES
     documents(id) ON DELETE CASCADE, ordinal INTEGER NOT NULL,
     heading_path TEXT, text TEXT NOT NULL)` — heading-scoped chunks, the RAG
     granularity ticket 24 attaches embeddings to.
   - `collections(name TEXT PRIMARY KEY, schema_json TEXT NOT NULL)` — the
     serialized `CollectionSchema` for the MicroCMS-style schema endpoint and
     D17 introspection.
   - An **external-content FTS5** table over `chunks` built with ticket 15's
     `createFts5Table` (content=`chunks`, content_rowid=`id`, columns `text`
     [+ `heading_path`], `trigram` tokenizer per ticket 15's Japanese note),
     and its `fts5SyncTriggers`. All emitted via ticket 15's builders — **no
     raw FTS5 SQL** in this package.
   `src/Schema/usecase/openIndex.ts`: open a `Db` over `node:sqlite`
   (mirroring `plgg-sql/example.ts`), run `migrateUp` through the migrator,
   return a ready handle. Errors stay on the typed `Result`/`PromisedResult`
   channel — never a throw.
3. **Heading-scoped chunker** (`src/Ingest/usecase/chunkBlocks.ts`): fold the
   plgg-md `Block[]` into `Chunk[]` with **exhaustive `match`** over the
   `Block` union — a new chunk opens at each `Heading`, gathering following
   blocks until the next heading of equal-or-higher `HeadingLevel`; carry a
   `heading_path` breadcrumb of ancestor headings; render each chunk's blocks
   to plain search text (reuse `renderMarkdown` output or a text projection —
   choose the one that keeps FTS matches sane, justify in the spec). Content
   before the first heading is chunk 0. Pure function, no I/O.
4. **Document ingest** (`src/Ingest/usecase/indexDocument.ts`): given
   `(collection, path, title, attributesJson, blocks, contentHash)`,
   transactionally (`plgg-sql` `transaction`) upsert the `documents` row,
   delete + reinsert its `chunks`, and let the FTS5 sync triggers keep the
   index current. **Idempotent**: re-ingesting identical input leaves the
   rows unchanged (upsert by `path`, compare `content_hash` to skip
   unchanged). `plgg-content` receives **already-validated** data — it does
   not import ticket 17's caster; validation happened upstream (§8).
5. **Rebuild & incremental sync**
   (`src/Ingest/usecase/rebuildIndex.ts`, `syncDocument.ts`): `rebuildIndex`
   ingests a whole corpus and **removes** documents whose `path` is no longer
   present (D4: the DB tracks git exactly), optionally issuing ticket 15's
   `fts5Rebuild` to guarantee a clean external-content index. `syncDocument`
   is the single-file incremental path (re-ingest one, or delete on removal).
   Both are transactional and idempotent. This is the recoverability contract
   (recovery policy): a dropped DB → one `rebuildIndex` → identical index.
6. **Query model** (`src/Query/model/`): `CollectionSchema` (serializable —
   name, fields with type+required, mirroring ticket 17's declarative
   `ContentModel` shape so `toCollectionSchema` is a pure map); `ListQuery`
   with `limit`/`offset`/`orderBy` (a **closed union** of `{ updated_at |
   title }`, direction `asc|desc`) / optional `q`. Casters (`asListQuery`)
   parse untrusted values: `limit` bounded (default e.g. 20, hard max e.g.
   100), `offset` ≥ 0, `orderBy` only from the closed set — Err (not clamp
   silently on garbage type) via plgg casters; `q` is free text.
7. **Query usecases** (`src/Query/usecase/`), each a `Db`-taking function
   returning `PromisedResult` with `decodeRows`-typed output — **HTTP-free**:
   - `listCollections(db)` → the registered `CollectionSchema[]` (MicroCMS
     "list APIs").
   - `listCollection(db, collection, listQuery)` → `{ contents, totalCount,
     limit, offset }` (MicroCMS list shape); `contents` are documents with
     their parsed `attributes_json`; when `q` is present, filter/rank via the
     FTS join (§below). `totalCount` from a `COUNT(*)` under the same filter.
   - `getDocument(db, collection, path)` → one document with attributes, or a
     typed not-found `Result` (the HTTP layer maps to 404).
   - `searchIndex(db, { q, collection?, limit, offset })` → bm25-ranked chunk
     hits joined back to their documents, using ticket 15's `fts5Match` +
     `bm25Rank` + `fts5Phrase(q)` (crash-safe: hostile `q` yields safe/empty,
     never a throw). This is the Phase 5 gate's search.
8. **plggpress delivery adapter** (`packages/plggpress/src/DeliveryApi/`):
   - `toCollectionSchema.ts`: map each ticket-17 `ContentModelBinding` in
     `SiteConfig.models` to a `plgg-content` `CollectionSchema` (pure).
   - `ingestFromConfig.ts`: run `discoverPaths` (from `framework/ssg.ts`),
     parse each page (`parseFrontmatter` + `parseBlocks`), **validate**
     attributes with ticket 17's `casterOf(model)` over `foldYaml(data)`,
     hash the source, and call `plgg-content` `rebuildIndex`. Reuse ticket
     17's `checkModels` result if that pass already validated the corpus, to
     avoid double work.
   - `deliveryApi.ts`: a `plgg-server` `Web` sub-app —
     `get("/", …)` → `listCollections`; `get("/:collection", …)` →
     `listCollection` (reading `getQuery` for `limit`/`offset`/`orderBy`/`q`
     through `asListQuery`); `get("/:collection/:path", …)` → `getDocument`
     (404 on not-found); `get("/search" , …)` or a top-level `/search` →
     `searchIndex`. Every handler returns `jsonResponse`; every error folds to
     a typed JSON error (no thrown exception escapes). Document in the sub-app
     that it is **read-only and unauthenticated by design** (public content),
     and that ticket 19/20 will wrap authz at the `route("/api", …)` seam.
9. **Mount at the seam** (`packages/plggpress/src/server/pressServer.ts`):
   add `route("/api", deliveryApi(index, schemas))` inside `pressServeWeb` —
   and, per ticket 14, **only** here. Build the index once at serve startup
   via `openIndex` + `ingestFromConfig` (D4: derived at boot). `pressRouter`
   and the SSG (`build`) render path stay byte-untouched (Phase 5 gate).
10. **Runnable demo** (`packages/plgg-content/example.ts`): open an in-memory
    index, ingest a few fixture documents with attributes across two
    collections, then `listCollection` (with paging + `q`), `getDocument`,
    and a bm25 `searchIndex` — printed in one `proc` chain, the
    proof-of-value artifact (working-style: prove value with a runnable
    demo). Quote its output in the PR.
11. **Specs** (co-located, flat `test()`, absolute imports, real
    `node:sqlite`): `chunkBlocks.spec.ts` (heading nesting, pre-heading
    chunk, exhaustive `Block` coverage); `indexDocument.spec.ts`
    (idempotency: ingest twice → identical rows; hash-skip); `rebuildIndex`
    (removed path drops its rows + chunks; `fts5Rebuild` restores a
    round-trip); `listCollection`/`getDocument` (paging math, `totalCount`,
    ordering, 404); `searchIndex` (**FTS5 gate** — bm25 ordering on a real
    corpus; hostile `q` never throws); `asListQuery` (bounds, closed
    `orderBy`, Err on garbage). In plggpress: `deliveryApi.spec.ts` drives
    the sub-app end-to-end via `toFetch` (status codes, JSON shapes, 404,
    bad `limit` → 400) and asserts the SSG output is unchanged.
12. House rules throughout: **no `as`/`any`/`ts-ignore`**; `Option`/`Result`
    + exhaustive `match` (`plgg-coding-style`); prefer `Str`/`asStr` over
    `SoftStr` in new code where seams allow; Prettier `printWidth: 50` per
    package; **zero new third-party dependencies** (every dep is a workspace
    `file:` package or Node stdlib; no native bindings — `node:sqlite` behind
    plgg-sql's `Db` seam is the only SQLite surface); FTS5 SQL only via ticket
    15's builders.

## Quality Gate

**Acceptance criteria**

1. **Derived & rebuildable (D4):** `rebuildIndex` reconstructs the entire
   index from the corpus alone; a spec drops the DB, rebuilds, and gets an
   identical index; ingest is idempotent (twice ⇒ same rows) and every write
   is transactional (a mid-ingest failure leaves no partial state observable).
2. **Chunking is exhaustive and correct:** `chunkBlocks` folds the full
   `Block` union with `match` (an added variant would be a compile error),
   heading scope + `heading_path` are correct, and pre-first-heading content
   is captured.
3. **FTS5 gate (Phase 5):** `searchIndex` returns bm25-ordered, `decodeRows`-
   typed results over the **real guide corpus** ingested through the pipeline;
   the demo/spec shows sane hits. All FTS5 SQL comes from ticket 15's
   builders — `grep` finds no hand-built `MATCH`/`fts5`/`bm25` strings and no
   identifier reaching SQL except via `SqlIdent`.
4. **Crash-safe, injection-safe delivery:** hostile `q` (quotes, parens,
   operators) never throws (via `fts5Phrase`); `limit`/`offset` out of range
   or non-numeric yield a typed 400, `limit` is hard-capped; `orderBy` accepts
   only its closed union — no query parameter is interpolated into SQL.
5. **MicroCMS-like delivery works:** `GET /api` lists collections with their
   schemas; `GET /api/:collection` returns `{ contents, totalCount, limit,
   offset }` with typed attributes and honors paging/ordering/`q`;
   `GET /api/:collection/:path` returns one document or 404; all responses are
   `jsonResponse`; the API is GET-only (no write verb registered).
6. **In-process reuse (D17):** the query functions are HTTP-free and callable
   with just a `Db` — a spec exercises them without any `Web`/`fetch`,
   proving the MCP/plugin path.
7. **No cycle, clean boundary:** `plgg-content` imports neither plggpress nor
   `plgg-http`/`plgg-server`; plggpress imports `plgg-content`; the delivery
   API mounts **only** at `pressServeWeb`'s seam.
8. **SSG untouched (Phase 5 byte-identity):** `plggpress build` output is
   byte-identical before/after (empty `diff -r`); `pressRouter`/`buildSpecOf`
   render path unmodified.
9. **Wiring & packaging:** `plgg-content` is in `npm-install.sh`, `build.sh`
   (correct dependency order, plgg-sql/db-migration moved ahead of plggpress,
   exact `cd`-line format), and `check-all.sh` (+ `test-plgg-content.sh`); its
   `exports` map carries `types`+`default` (concern 51); a fresh
   `check-all.sh`'s publish-order derivation stays consistent.
10. **No escape hatches, zero new deps, coverage:** `grep` finds no
    `as `/`any`/`ts-ignore` in new modules; no new third-party dependency in
    any `package.json`; `plgg-content` clears its ≥90 four-metric gate and
    plggpress stays green on all four.

**Verification method**

Run `scripts/tsc-plgg.sh` (where applicable),
`scripts/test-plgg-content.sh`, and `scripts/test-plggpress.sh` and paste the
gate lines; run `npx tsx packages/plgg-content/example.ts` and show the paged
list + bm25 search output. Serve smoke: from `packages/guide`,
`npx plggpress serve --port <p>` (ticket 14), then
`curl -s 'http://localhost:<p>/api'`,
`curl -s 'http://localhost:<p>/api/<collection>?limit=5'`, and
`curl -s 'http://localhost:<p>/api/search?q=<term>'` — paste the JSON and
status codes (the Phase 5 "sane results on the real guide corpus" evidence).
Byte-identity: `npx plggpress build` into two dirs before/after and paste the
empty `diff -r`. Then a **fresh** `scripts/check-all.sh` (clean rebuild —
stale dists must not mask the new package edge or the build-order change) must
be green end-to-end.

**Gate**

All ten acceptance criteria hold objectively AND the fresh `check-all.sh` run
is green. Any hand-assembled FTS5/identifier SQL, any `as`/`any`/`ts-ignore`,
any new third-party dependency, an import cycle (plgg-content ↔ plggpress), a
non-empty SSG diff, an import-only `plgg-content` export map, a write verb on
the delivery API, or a coverage dip fails the ticket.

## Considerations

- **Ingest timing on the served instance.** This ticket builds the index at
  serve startup and exposes `syncDocument` for incremental updates, but does
  **not** wire a file watcher — hot-reload/watch is a toolchain/operations
  concern (ticket 28 production topology, and concern 51's "hot reload does
  not refresh site.config.ts"). If startup ingest of a large corpus proves
  slow, a persisted on-disk index + hash-diff incremental sync at boot is the
  optimization; the API contract does not change.
- **DB location & lifecycle.** Where the SQLite file lives (in-memory vs a
  path under a state dir) and its backup/restore drill belong to ticket 28;
  this ticket keeps `openIndex` path-parameterized and defaults to a
  rebuildable file, honoring D4 (losing it is recoverable).
- **`plgg-content` is HTTP-free on purpose.** Resist adding `plgg-http`/
  `plgg-server` deps to it — the MCP server (tickets 26/27) and plugin export
  (ticket 30) consume the query functions directly; an HTTP dependency there
  would drag the server runtime into the plugin. If a shared HTTP shape is
  ever wanted, it belongs in plggpress or a separate adapter, not here.
- **Authorization is deferred by design.** The delivery API is public
  read-only (the same content the SSG already serves anonymously), so it needs
  no authz now; tickets 19/20 add the guard at the `route("/api", …)` seam.
  Do **not** half-implement auth here. Revisit trigger: guest-editable /
  private collections (D4's SQLite-primary trigger) will need per-collection
  visibility — model `CollectionSchema` so a `visibility` field can be added
  without reshaping the API.
- **Chunk granularity is the RAG seam.** Heading-scoped chunks are chosen so
  ticket 24 can attach a `Float32` embedding BLOB per chunk (D11's opt-in
  tier) without re-chunking. Keep `chunks` stable; if ticket 24 needs
  overlap/size tuning, that is a chunker parameter, not a schema change.
- **Contentless vs external-content FTS5.** External-content (over `chunks`)
  is chosen so a single `rebuildIndex` and the sync triggers keep search
  current under updates/deletes (ticket 15's Considerations flag contentless
  tables as insert-only). If corpus scale later makes triggers costly, D11's
  revisit trigger (in-house ANN) is the escalation, not a schema hack here.
- **MicroCMS parity is intentional but not slavish.** The `{ contents,
  totalCount, limit, offset }` list shape and `?limit/&offset/&orderBy/&q`
  conventions match MicroCMS so SPA consumers feel at home; richer filtering
  (`filters=` DSL, `fields=` projection) is deferred until a real SPA
  consumer earns it — note it in ticket 20/29 if the admin UI needs it.
- **Revisit trigger:** if this ticket finds itself string-assembling any FTS5
  SQL, ticket 15's vocabulary is incomplete — extend that module rather than
  letting raw SQL creep into `plgg-content`.
