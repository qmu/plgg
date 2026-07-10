import {
  type Option,
  type Result,
  type InvalidError,
  type Defect,
  type PromisedResult,
  type SoftStr,
  proc,
  ok,
  cast,
  asRawObj,
  asNum,
  forProp,
  chainResult,
  matchOption,
} from "plgg";
import {
  type Db,
  type SqlError,
  type Sql,
  type SqlIdent,
  sql,
  identSql,
  query,
  decodeRow,
  decodeRows,
  fts5Match,
  fts5Phrase,
} from "plgg-sql";
import {
  type Document,
  asDocument,
} from "plgg-cms/content/Ingest/model/Document";
import { type ListQuery } from "plgg-cms/content/Query/model/ListQuery";
import { type ListResult } from "plgg-cms/content/Query/model/ListResult";
import { ftsIdent } from "plgg-cms/content/Schema/usecase/contentSchema";

const asCountRow = (
  row: unknown,
): Result<{ n: number }, InvalidError> =>
  cast(row, asRawObj, forProp("n", asNum));

/** `ORDER BY <col> <dir>` from the CLOSED {@link ListQuery} set (no injection). */
const orderClause = (q: ListQuery): Sql => {
  const col: Sql =
    q.orderBy === "title"
      ? sql`title`
      : sql`updated_at`;
  const dir: Sql =
    q.orderDir === "asc" ? sql`ASC` : sql`DESC`;
  return sql`ORDER BY ${col} ${dir}`;
};

/** The WHERE predicate: the collection, plus an FTS filter when `q` is present. */
const buildFilter = (
  collection: SoftStr,
  q: Option<SoftStr>,
): Result<Sql, InvalidError> =>
  matchOption<
    SoftStr,
    Result<Sql, InvalidError>
  >(
    () => ok(sql`collection = ${collection}`),
    (text: SoftStr): Result<Sql, InvalidError> =>
      chainResult(
        (fts: SqlIdent): Result<Sql, InvalidError> =>
          ok(
            sql`collection = ${collection} AND documents.id IN (SELECT c.document_id FROM chunks c JOIN ${identSql(fts)} ON ${identSql(fts)}.rowid = c.id WHERE ${fts5Match(fts)(fts5Phrase(text))})`,
          ),
      )(ftsIdent()),
  )(q);

/**
 * The MicroCMS "list API" for one collection: a paged,
 * ordered window of documents (with `attributes` parsed),
 * plus the `totalCount` under the same filter. When
 * `query.q` is present it is FTS-filtered (a document
 * matches if any of its chunks matches). HTTP-free.
 */
export const listCollection =
  (db: Db) =>
  (
    collection: SoftStr,
    listQuery: ListQuery,
  ): PromisedResult<
    ListResult,
    SqlError | InvalidError | Defect
  > =>
    proc(
      collection,
      (): Result<Sql, InvalidError> =>
        buildFilter(collection, listQuery.q),
      (filter: Sql) =>
        proc(
          query(db)(
            sql`SELECT COUNT(*) AS n FROM documents WHERE ${filter}`,
          ),
          decodeRow(asCountRow),
          (count: { n: number }) =>
            proc(
              query(db)(
                sql`SELECT * FROM documents WHERE ${filter} ${orderClause(listQuery)} LIMIT ${listQuery.limit} OFFSET ${listQuery.offset}`,
              ),
              decodeRows(asDocument),
              (
                contents: ReadonlyArray<Document>,
              ): Result<ListResult, InvalidError> =>
                ok({
                  contents,
                  totalCount: count.n,
                  limit: listQuery.limit,
                  offset: listQuery.offset,
                }),
            ),
        ),
    );
