import {
  type SoftStr,
  type Option,
  type Result,
  type InvalidError,
  type PromisedResult,
  type Defect,
  proc,
  ok,
  err,
  cast,
  asObj,
  asNum,
  asSoftStr,
  forProp,
  matchResult,
  matchOption,
  fromNullable,
} from "plgg";
import { type Block } from "plgg-md";
import {
  type Db,
  type SqlError,
  sql,
  query,
  exec,
  transaction,
  decodeRow,
  decodeRows,
} from "plgg-sql";
import { type Chunk } from "plgg-cms/content/Ingest/model/Chunk";
import { chunkBlocks } from "plgg-cms/content/Ingest/usecase/chunkBlocks";

/**
 * Everything needed to (re)index one page — the
 * already-validated data plgg-cms/content receives (it does NOT
 * re-run ticket 17's caster; validation happened upstream).
 * `attributesJson` is the serialized typed frontmatter;
 * `updatedAt` is the caller's timestamp (git/file mtime), so
 * ingest carries no clock.
 */
export type IndexInput = Readonly<{
  collection: SoftStr;
  path: SoftStr;
  title: Option<SoftStr>;
  attributesJson: SoftStr;
  blocks: ReadonlyArray<Block>;
  contentHash: SoftStr;
  updatedAt: SoftStr;
}>;

type IndexError = SqlError | InvalidError | Defect;

const asHashRow = (
  row: unknown,
): Result<
  { content_hash: SoftStr },
  InvalidError
> => cast(row, asObj, forProp("content_hash", asSoftStr));

const asIdRow = (
  row: unknown,
): Result<{ id: number }, InvalidError> =>
  cast(row, asObj, forProp("id", asNum));

const upsert = (input: IndexInput) =>
  sql`INSERT INTO documents (collection, path, title, content_hash, attributes_json, updated_at) VALUES (${input.collection}, ${input.path}, ${input.title}, ${input.contentHash}, ${input.attributesJson}, ${input.updatedAt}) ON CONFLICT(path) DO UPDATE SET collection = excluded.collection, title = excluded.title, content_hash = excluded.content_hash, attributes_json = excluded.attributes_json, updated_at = excluded.updated_at`;

/** Inserts a document's chunks in order (sequential fold). */
const insertChunks = (
  db: Db,
  documentId: number,
  chunks: ReadonlyArray<Chunk>,
): PromisedResult<null, SqlError | Defect> =>
  chunks.reduce<
    PromisedResult<null, SqlError | Defect>
  >(
    (acc, c: Chunk) =>
      acc.then(
        matchResult<
          null,
          SqlError | Defect,
          PromisedResult<
            null,
            SqlError | Defect
          >
        >(
          (e: SqlError | Defect) =>
            Promise.resolve(err(e)),
          () =>
            proc(
              exec(db)(
                sql`INSERT INTO chunks (document_id, ordinal, heading_path, text) VALUES (${documentId}, ${c.ordinal}, ${c.headingPath}, ${c.text})`,
              ),
              () => ok(null),
            ),
        ),
      ),
    Promise.resolve(ok(null)),
  );

/**
 * Transactionally (re)indexes one page: skips untouched when
 * the stored `content_hash` already matches (idempotent), else
 * upserts the `documents` row by `path` and rewrites its
 * `chunks` (the FTS5 sync triggers keep the index current).
 * Resolves `true` when it wrote, `false` when it skipped.
 */
export const indexDocument =
  (db: Db) =>
  (
    input: IndexInput,
  ): PromisedResult<boolean, IndexError> => {
    const writeDoc = (): PromisedResult<
      boolean,
      IndexError
    > =>
      transaction(db, () =>
        proc(
          exec(db)(upsert(input)),
          () =>
            query(db)(
              sql`SELECT id FROM documents WHERE path = ${input.path}`,
            ),
          decodeRow(asIdRow),
          (docId: { id: number }) =>
            proc(
              exec(db)(
                sql`DELETE FROM chunks WHERE document_id = ${docId.id}`,
              ),
              () =>
                insertChunks(
                  db,
                  docId.id,
                  chunkBlocks(input.blocks),
                ),
              () => ok(true),
            ),
        ),
      )(null);
    return proc(
      query(db)(
        sql`SELECT content_hash FROM documents WHERE path = ${input.path}`,
      ),
      decodeRows(asHashRow),
      (
        rows: ReadonlyArray<{
          content_hash: SoftStr;
        }>,
      ): PromisedResult<boolean, IndexError> =>
        matchOption<
          { content_hash: SoftStr },
          PromisedResult<boolean, IndexError>
        >(
          () => writeDoc(),
          (row: { content_hash: SoftStr }) =>
            row.content_hash === input.contentHash
              ? Promise.resolve(ok(false))
              : writeDoc(),
        )(fromNullable(rows[0])),
    );
  };
