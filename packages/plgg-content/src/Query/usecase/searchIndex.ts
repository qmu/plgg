import {
  type Result,
  type InvalidError,
  type Defect,
  type PromisedResult,
  type SoftStr,
  proc,
  pipe,
  ok,
  isErr,
  cast,
  asRawObj,
  asNum,
  asSoftStr,
  forProp,
  chainResult,
  none,
} from "plgg";
import {
  type Db,
  type SqlError,
  type SqlIdent,
  sql,
  identSql,
  query,
  decodeRows,
  fts5Match,
  fts5Phrase,
  bm25Rank,
} from "plgg-sql";
import {
  type Document,
  asDocument,
} from "plgg-content/Ingest/model/Document";
import { type SearchHit } from "plgg-content/Query/model/ListResult";
import { ftsIdent } from "plgg-content/Schema/usecase/contentSchema";

/** Decodes a search row: the document columns + heading + BM25 rank. */
const asSearchRow = (
  row: unknown,
): Result<SearchHit, InvalidError> =>
  pipe(
    asDocument(row),
    chainResult(
      (
        document: Document,
      ): Result<SearchHit, InvalidError> => {
        const meta = cast(
          row,
          asRawObj,
          forProp("hp", asSoftStr),
          forProp("rank", asNum),
        );
        return isErr(meta)
          ? meta
          : ok({
              document,
              headingPath: meta.content.hp,
              rank: meta.content.rank,
            });
      },
    ),
  );

/**
 * The always-on FTS5 (BM25) search (D11) — matches chunks,
 * joins back to their documents, ranks by relevance (lower
 * BM25 = better), and returns the top `limit` hits with the
 * matched section's heading breadcrumb. Works with NO LLM
 * key configured; ticket 24 layers cosine re-ranking on the
 * same `chunks` table. User text is `fts5Phrase`-sanitized,
 * so metacharacters cannot crash the query. HTTP-free.
 */
export const searchIndex =
  (db: Db) =>
  (
    rawQuery: SoftStr,
    limit: number,
  ): PromisedResult<
    ReadonlyArray<SearchHit>,
    SqlError | InvalidError | Defect
  > =>
    proc(
      rawQuery,
      (): Result<SqlIdent, InvalidError> =>
        ftsIdent(),
      (fts: SqlIdent) =>
        query(db)(
          searchSql(fts, rawQuery, limit),
        ),
      decodeRows(asSearchRow),
    );

const searchSql = (
  fts: SqlIdent,
  rawQuery: SoftStr,
  limit: number,
) =>
  sql`SELECT d.*, COALESCE(c.heading_path, '') AS hp, ${bm25Rank(fts, none())} AS rank FROM ${identSql(fts)} JOIN chunks c ON c.id = ${identSql(fts)}.rowid JOIN documents d ON d.id = c.document_id WHERE ${fts5Match(fts)(fts5Phrase(rawQuery))} ORDER BY rank LIMIT ${limit}`;
