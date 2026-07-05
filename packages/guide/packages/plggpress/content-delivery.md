# Content & delivery

How [plggpress](/packages/plggpress) turns a
git-primary Markdown corpus into a queryable content
API. The corpus stays canonical in git; a derived,
rebuildable SQLite index ([plgg-content](/packages/plgg-content))
backs a MicroCMS-like read-only delivery API and
always-on FTS5 (BM25) search — decision **D4**: content
is filesystem-primary, SQLite is a derived index that
costs nothing to lose.

## Writing an app with it

The delivery surface is plain typed `Db`-taking
functions from [plgg-content](/packages/plgg-content) —
the same functions back the `/api` HTTP mount, the
admin UI, the MCP tools, and the plugin export. From
the plgg-content README:

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

On the served instance, plggpress mounts these behind
`GET /api/*` (the search endpoint included) — a thin
HTTP adapter over the query core.

## Content models

Frontmatter is parsed by a YAML-subset parser on
[plgg-parser](/packages/plgg-parser) and validated
through caster-backed content models declared in
`site.config.ts`, so a page's typed fields are checked
at ingest — an invalid document is an `Err` naming the
field, not a silently-wrong row.

## Vocabulary

From [plgg-content](/packages/plgg-content):

- **Index** — `openIndex` (idempotent schema),
  `registerCollection`, `rebuildIndex` (full,
  idempotent — the primary operation), `indexDocument`
  / `removeDocument` (incremental optimizations).
- **Query** — `listCollections` / `listCollection`
  (paginated `{ contents, totalCount, limit, offset }`),
  `getDocument` (`Option<Document>`), `searchIndex`
  (BM25 top-k), and the `ListQuery` caster (bounded
  `limit`, closed `orderBy`, sanitized `q`).
- **Schema** — `documents`, `chunks` (heading-scoped
  granularity for search and RAG), `collections`, and
  an external-content FTS5 table over `chunks` — all
  emitted through [plgg-sql](/packages/plgg-sql)'s FTS5
  builders, no raw FTS5 SQL.

## Why it's shaped this way

Because the index is derived, the primary operation is
a full idempotent `rebuildIndex`: losing the database
costs nothing but a rebuild from the Markdown. The
query core is HTTP-free on purpose — the delivery API,
admin, MCP tools, and plugin export are all thin
adapters over the same typed functions, so there is one
source of truth for "what the content says", reachable
by a browser, an agent, or a build step alike.
