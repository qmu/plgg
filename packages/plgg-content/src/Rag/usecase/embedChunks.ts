import {
  type Result,
  type Num,
  type SoftStr,
  type PromisedResult,
  type InvalidError,
  type Defect,
  ok,
  proc,
  cast,
  matchResult,
  asRawObj,
  asNum,
  asSoftStr,
  forProp,
} from "plgg";
import {
  type Db,
  type SqlError,
  sql,
  query,
  decodeRows,
} from "plgg-sql";
import { type Embedding } from "plgg-content/Rag/model/Embedding";
import { type Embedder } from "plgg-content/Rag/model/Embedder";
import { saveChunkEmbedding } from "plgg-content/Rag/usecase/chunkEmbeddings";

type PendingChunk = Readonly<{
  id: Num;
  text: SoftStr;
}>;

export type EmbedError =
  | SqlError
  | InvalidError
  | Defect;

const asPendingRow = (
  row: unknown,
): Result<PendingChunk, InvalidError> =>
  cast(
    row,
    asRawObj,
    forProp("id", asNum),
    forProp("text", asSoftStr),
  );

/**
 * Embed one chunk, BEST-EFFORT: an embed failure (the graceful
 * D11 path) resolves to `false` — the chunk stays un-embedded
 * and search keeps working via FTS5 — rather than aborting the
 * whole batch. A successful embed is saved and resolves `true`.
 */
const embedOne =
  (db: Db, embedder: Embedder) =>
  (
    row: PendingChunk,
  ): PromisedResult<boolean, EmbedError> =>
    embedder.embed(row.text).then(
      matchResult<
        Embedding,
        Defect,
        PromisedResult<boolean, EmbedError>
      >(
        () => Promise.resolve(ok(false)),
        (vec: Embedding) =>
          proc(
            saveChunkEmbedding(db)(row.id, vec),
            () => ok(true),
          ),
      ),
    );

const countEmbedded = (
  db: Db,
  embedder: Embedder,
  rows: ReadonlyArray<PendingChunk>,
): PromisedResult<Num, EmbedError> =>
  rows.reduce<PromisedResult<Num, EmbedError>>(
    (accP, row) =>
      proc(accP, (acc: Num) =>
        proc(
          embedOne(db, embedder)(row),
          (didEmbed: boolean) =>
            ok(didEmbed ? acc + 1 : acc),
        ),
      ),
    Promise.resolve(ok(0)),
  );

/**
 * Embed-on-index (ticket 24): embed every chunk whose
 * `embedding` is still NULL and save each vector, returning how
 * many were embedded. Idempotent — already-embedded chunks are
 * skipped by the `IS NULL` filter, so this is safe to run after
 * each ingest. With a provider that keeps failing, the count is
 * simply 0 and the corpus stays FTS5-served.
 */
export const embedPendingChunks =
  (db: Db, embedder: Embedder) =>
  (): PromisedResult<Num, EmbedError> =>
    proc(
      query(db)(
        sql`SELECT id, text FROM chunks WHERE embedding IS NULL`,
      ),
      decodeRows(asPendingRow),
      (rows: ReadonlyArray<PendingChunk>) =>
        countEmbedded(db, embedder, rows),
    );
