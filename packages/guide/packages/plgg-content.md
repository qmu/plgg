# plgg-content

A **derived, rebuildable SQLite index** over a
git-primary Markdown corpus, with an HTTP-agnostic,
MicroCMS-like read-only query API and always-on FTS5
(BM25) search — built from scratch on
[plgg](/packages/plgg/), [plgg-md](/packages/plgg-md),
[plgg-sql](/packages/plgg-sql), and
[plgg-db-migration](/packages/plgg-db-migration). It is
the content spine the served
[plggpress](/packages/plggpress/content-delivery)
instance mounts its `/api` over.

The governing decision is **D4**: content is
git/filesystem-primary; SQLite is a derived,
rebuildable index. Every row is reconstructable from
the Markdown — losing the database costs nothing but a
`rebuildIndex`.

## Writing an app with it

The query surface is plain typed `Db`-taking functions,
not an HTTP framework — the same functions back the SPA
delivery API, the admin UI, the MCP tools, and the
plugin export. From the package README:

```typescript
import {
  openIndex,
  rebuildIndex,
  listCollection,
  getDocument,
  searchIndex,
} from "plgg-content";

// open a ready index (schema created idempotently)
const db = await openIndex("content.db");

// ingest already-validated pages
await rebuildIndex(db)(pages);

// MicroCMS-style delivery
await listCollection(db)("blog", listQuery);
// → { contents, totalCount, limit, offset }
await getDocument(db)("blog", "/blog/hello");
// → Option<Document>
await searchIndex(db)("kangaroo", 10);
// → BM25-ranked hits, no LLM key needed
```

## Vocabulary

- **Index** — `openIndex` (idempotent schema),
  `registerCollection`, `rebuildIndex` (full,
  idempotent — the primary operation), `indexDocument`
  / `removeDocument` (incremental optimizations).
- **Query** — `listCollections` / `listCollection` /
  `getDocument` / `searchIndex`, plus the `ListQuery`
  caster (bounded `limit`, closed `orderBy`, sanitized
  `q`) and the serializable `CollectionSchema`.
- **Schema** — `documents` (one row per page, typed
  frontmatter serialized), `chunks` (heading-scoped
  granularity for search and RAG), `collections`, and
  an external-content FTS5 table over `chunks` with its
  sync triggers — all emitted through
  [plgg-sql](/packages/plgg-sql)'s FTS5 builders, no
  raw FTS5 SQL.

## Why it exists

A git-primary corpus is canonical and reviewable, but a
browser or an agent needs paginated collections and
ranked search that reading Markdown files cannot serve.
plgg-content derives exactly that from the corpus and
keeps it rebuildable, so the index can be dropped and
regenerated at any time (D4). Because the query core is
HTTP-free, the [delivery API](/packages/plggpress/content-delivery),
admin, [MCP tools](/packages/plgg-mcp), and plugin
export are all thin adapters over one set of typed
functions.

## How it's organized

`Schema/` emits the tables (idempotent `execScript` — no
versioned ledger, since the whole DB is rebuildable);
`Ingest/` folds [plgg-md](/packages/plgg-md)'s `Block`
AST into heading-scoped chunks and runs the
transactional `indexDocument` / `rebuildIndex`;
`Query/` holds the read functions and casters; and
`vendors/` is the only driver-aware code — the
`node:sqlite` implementation of plgg-sql's `Db` seam. It
is **plggpress-agnostic**: plggpress depends on it,
never the reverse.
