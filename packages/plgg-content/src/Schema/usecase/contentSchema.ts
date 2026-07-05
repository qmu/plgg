import {
  type SoftStr,
  type Result,
  type InvalidError,
  pipe,
  chainResult,
  ok,
  some,
} from "plgg";
import {
  type SqlIdent,
  type Sql,
  type Fts5Table,
  asSqlIdent,
  fts5Table,
  fts5Column,
  externalContent,
  createFts5Table,
  fts5SyncTriggers,
} from "plgg-sql";

/**
 * The git-derived index's base tables (D4). `documents` is
 * one row per page (its ticket-17-validated typed
 * frontmatter serialized into `attributes_json`); `chunks`
 * is the heading-scoped RAG/search granularity (ticket 24
 * attaches embeddings here); `collections` holds the
 * serialized `CollectionSchema` for the MicroCMS schema
 * endpoint + D17 introspection. `IF NOT EXISTS` so the
 * script is safe to re-run.
 */
const BASE_TABLES: SoftStr = `
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY,
  collection TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  title TEXT,
  content_hash TEXT NOT NULL,
  attributes_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  heading_path TEXT,
  text TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS collections (
  name TEXT PRIMARY KEY,
  schema_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);`.trim();

/** The FTS5 virtual-table identifier, resolved once. */
export const ftsIdent = (): Result<
  SqlIdent,
  InvalidError
> => asSqlIdent("chunks_fts");

/** The FTS5 external-content table over `chunks` (ticket-15 builders). */
export const chunksFtsTable = (): Result<
  Fts5Table,
  InvalidError
> =>
  pipe(
    asSqlIdent("chunks_fts"),
    chainResult((ftsName: SqlIdent) =>
      pipe(
        asSqlIdent("text"),
        chainResult((textCol: SqlIdent) =>
          pipe(
            asSqlIdent("heading_path"),
            chainResult((hpCol: SqlIdent) =>
              pipe(
                asSqlIdent("chunks"),
                chainResult(
                  (srcTbl: SqlIdent) =>
                    pipe(
                      asSqlIdent("id"),
                      chainResult(
                        (rowid: SqlIdent) =>
                          fts5Table({
                            name: ftsName,
                            columns: [
                              fts5Column(
                                textCol,
                              ),
                              fts5Column(
                                hpCol,
                              ),
                            ],
                            content:
                              externalContent(
                                srcTbl,
                                rowid,
                              ),
                            // trigram: substring +
                            // CJK-friendly (ticket 15's
                            // Japanese note).
                            tokenizer:
                              some("trigram"),
                          }),
                      ),
                    ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );

/**
 * The full derived-index DDL script — base tables, then the
 * FTS5 virtual table and its external-content sync triggers,
 * all emitted through ticket 15's builders (NO raw FTS5 SQL
 * assembled here). Bodies run verbatim via `execScript`.
 */
export const contentSchemaDdl = (): Result<
  SoftStr,
  InvalidError
> =>
  pipe(
    chunksFtsTable(),
    chainResult(
      (
        table: Fts5Table,
      ): Result<SoftStr, InvalidError> =>
        chainResult(
          (
            triggers: ReadonlyArray<Sql>,
          ): Result<SoftStr, InvalidError> =>
            ok(
              [
                BASE_TABLES,
                `${createFts5Table(table).content.text};`,
                ...triggers.map(
                  (t: Sql) =>
                    `${t.content.text};`,
                ),
              ].join("\n"),
            ),
        )(fts5SyncTriggers(table)),
    ),
  );
