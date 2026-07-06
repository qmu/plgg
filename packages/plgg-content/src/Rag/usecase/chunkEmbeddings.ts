import {
  type Result,
  type Num,
  type PromisedResult,
  type InvalidError,
  type Defect,
  ok,
  proc,
  cast,
  chainResult,
  mapResult,
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
  exec,
  decodeRows,
} from "plgg-sql";
import {
  type Embedding,
  serializeEmbedding,
  deserializeEmbedding,
} from "plgg-content/Rag/model/Embedding";
import { type Candidate } from "plgg-content/Rag/usecase/similarity";

/** Decode an `id, embedding` row into a rankable {@link Candidate}. */
const asCandidateRow = (
  row: unknown,
): Result<Candidate<Num>, InvalidError> =>
  chainResult<
    { id: Num; embedding: string },
    Candidate<Num>,
    InvalidError
  >((r: { id: Num; embedding: string }) =>
    mapResult<
      Embedding,
      Candidate<Num>,
      InvalidError
    >((vec: Embedding) => ({
      id: r.id,
      embedding: vec,
    }))(deserializeEmbedding(r.embedding)),
  )(
    cast(
      row,
      asRawObj,
      forProp("id", asNum),
      forProp("embedding", asSoftStr),
    ),
  );

/**
 * Attach an embedding to a chunk on the ticket-16 index
 * (ticket 24, D11) — the vector is serialized into the nullable
 * `embedding` TEXT column added to `chunks`. Idempotent: a
 * re-embed overwrites. The index is derived/rebuildable, so
 * this stays a plain column, not a durable-store migration.
 */
export const saveChunkEmbedding =
  (db: Db) =>
  (
    chunkId: Num,
    vec: Embedding,
  ): PromisedResult<null, SqlError | Defect> =>
    proc(
      exec(db)(
        sql`UPDATE chunks SET embedding = ${serializeEmbedding(vec)} WHERE id = ${chunkId}`,
      ),
      () => ok(null),
    );

/**
 * Load every embedded chunk as a ranking {@link Candidate}
 * (only rows whose `embedding` is populated — an operator with
 * no key has none, and {@link semanticSearch} then degrades to
 * FTS5). The id is the chunk rowid, so a hit maps straight back
 * to its text.
 */
export const loadEmbeddedChunks = (
  db: Db,
): PromisedResult<
  ReadonlyArray<Candidate<Num>>,
  SqlError | InvalidError | Defect
> =>
  proc(
    query(db)(
      sql`SELECT id, embedding FROM chunks WHERE embedding IS NOT NULL`,
    ),
    decodeRows(asCandidateRow),
  );
