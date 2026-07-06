# plgg-content

> **UNSTABLE** — Experimental study work (POC). Part of the [plgg monorepo](../../README.md).

A **derived, rebuildable SQLite index** over a git-primary Markdown corpus, with
an **HTTP-agnostic, MicroCMS-like read-only query API** and **always-on FTS5
(BM25) search**, built **from scratch on the [plgg](../plgg/) family**
([plgg-md](../plgg-md/), [plgg-sql](../plgg-sql/),
[plgg-db-migration](../plgg-db-migration/)).

The governing decision is **D4**: *content is git/filesystem-primary; SQLite is a
derived, rebuildable index.* Every row is reconstructable from the Markdown —
losing the database costs nothing but a `rebuildIndex`. The primary operation is
therefore a **full, idempotent rebuild**; incremental `indexDocument` /
`removeDocument` are optimizations over it.

## HTTP-free query core

The query surface is **plain typed `Db`-taking functions**, not an HTTP
framework — the same functions back the SPA delivery API, the admin UI, the MCP
tools, and the Claude Code plugin export. An HTTP layer (e.g. plggpress's `/api`
mount) is a thin adapter over them.

```typescript
import {
  openIndex,
  registerCollection,
  indexDocument,
  rebuildIndex,
  listCollection,
  getDocument,
  searchIndex,
} from "plgg-content";

// open a ready index (schema created idempotently)
const db = /* Ok */ await openIndex("content.db");

// ingest already-validated pages (ticket-17 content models
// validate upstream; plgg-content stores + serves)
await rebuildIndex(db)(pages);

// MicroCMS-style delivery
await listCollection(db)("blog", listQuery); // { contents, totalCount, limit, offset }
await getDocument(db)("blog", "/blog/hello"); // Option<Document>
await searchIndex(db)("kangaroo", 10);        // BM25-ranked hits, no LLM key needed
```

## Design

- **Schema** (`Schema/`) — `documents` (one row per page, typed frontmatter
  serialized), `chunks` (heading-scoped RAG/search granularity), `collections`
  (serialized `CollectionSchema`), and an **external-content FTS5** table over
  `chunks` with its sync triggers — all emitted through
  [plgg-sql](../plgg-sql/)'s FTS5 builders (no raw FTS5 SQL). The schema is
  created idempotently via `execScript` (D4: the whole DB is rebuildable, so no
  versioned ledger).
- **Ingest** (`Ingest/`) — a pure heading-scoped `chunkBlocks` fold over
  [plgg-md](../plgg-md/)'s `Block` AST, a transactional idempotent
  `indexDocument` (skips an unchanged `content_hash`), and `rebuildIndex` (ingest
  + prune vanished paths).
- **Query** (`Query/`) — `listCollections` / `listCollection` /
  `getDocument` / `searchIndex`, plus the `ListQuery` caster (bounded `limit`,
  closed `orderBy`, sanitized `q`) and the serializable `CollectionSchema`.
- **vendors/** — the only driver-aware code: the `node:sqlite` implementation of
  plgg-sql's `Db` seam.

The only runtime dependencies are `plgg`, `plgg-md`, `plgg-sql`, and
`plgg-db-migration`; it is **plggpress-agnostic** (plggpress depends on it, never
the reverse).
