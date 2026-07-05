import {
  type Option,
  type InvalidError,
  type Defect,
  type PromisedResult,
  type SoftStr,
  proc,
  ok,
  fromNullable,
} from "plgg";
import {
  type Db,
  type SqlError,
  sql,
  query,
  decodeRows,
} from "plgg-sql";
import {
  type Document,
  asDocument,
} from "plgg-content/Ingest/model/Document";

/**
 * Fetches one document by `collection` + `path` (the
 * MicroCMS "get API"), `None` when absent. `path` is UNIQUE,
 * so at most one row. HTTP-free.
 */
export const getDocument =
  (db: Db) =>
  (
    collection: SoftStr,
    path: SoftStr,
  ): PromisedResult<
    Option<Document>,
    SqlError | InvalidError | Defect
  > =>
    proc(
      query(db)(
        sql`SELECT * FROM documents WHERE collection = ${collection} AND path = ${path} LIMIT 1`,
      ),
      decodeRows(asDocument),
      (docs: ReadonlyArray<Document>) =>
        ok(fromNullable(docs[0])),
    );
