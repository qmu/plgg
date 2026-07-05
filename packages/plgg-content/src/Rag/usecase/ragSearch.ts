import {
  type Result,
  type Option,
  type SoftStr,
  type PromisedResult,
  type InvalidError,
  type Defect,
  pipe,
  ok,
  proc,
  isErr,
  cast,
  chainResult,
  asRawObj,
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
import {
  type Document,
  asDocument,
} from "plgg-content/Ingest/model/Document";
import { type SearchHit } from "plgg-content/Query/model/ListResult";
import { searchIndex } from "plgg-content/Query/usecase/searchIndex";
import { type Embedder } from "plgg-content/Rag/model/Embedder";
import {
  type Candidate,
} from "plgg-content/Rag/usecase/similarity";
import { semanticSearch } from "plgg-content/Rag/usecase/semanticSearch";
import { deserializeEmbedding } from "plgg-content/Rag/model/Embedding";

/**
 * Decode a joined `chunk + document + embedding` row into a
 * ranking candidate whose id is a full {@link SearchHit} — so
 * the cosine top-k yields the SAME shape FTS5 returns and the
 * two retrieval paths unify. `rank` starts 0 (order comes from
 * the cosine sort). A corrupt embedding fails the row closed.
 */
const asHitCandidate = (
  row: unknown,
): Result<
  Candidate<SearchHit>,
  InvalidError
> =>
  pipe(
    asDocument(row),
    chainResult(
      (
        document: Document,
      ): Result<
        Candidate<SearchHit>,
        InvalidError
      > => {
        const meta = cast(
          row,
          asRawObj,
          forProp("hp", asSoftStr),
          forProp("embedding", asSoftStr),
        );
        if (isErr(meta)) {
          return meta;
        }
        const vec = deserializeEmbedding(
          meta.content.embedding,
        );
        return isErr(vec)
          ? vec
          : ok({
              id: {
                document,
                headingPath: meta.content.hp,
                rank: 0,
              },
              embedding: vec.content,
            });
      },
    ),
  );

/** Load every embedded chunk as a {@link SearchHit} candidate. */
const loadEmbeddedHits = (
  db: Db,
): PromisedResult<
  ReadonlyArray<Candidate<SearchHit>>,
  SqlError | InvalidError | Defect
> =>
  proc(
    query(db)(
      sql`SELECT d.*, COALESCE(c.heading_path, '') AS hp, c.embedding AS embedding FROM chunks c JOIN documents d ON d.id = c.document_id WHERE c.embedding IS NOT NULL`,
    ),
    decodeRows(asHitCandidate),
  );

/**
 * The hybrid RAG search over the LIVE ticket-16 index (ticket
 * 24, D11). Delegates to {@link semanticSearch}: with a
 * configured {@link Embedder} and embedded chunks it cosine-
 * re-ranks them; otherwise — no key, an embed failure, or an
 * un-embedded corpus — it degrades to the always-on
 * {@link searchIndex} FTS5/BM25 path. Both paths return the
 * SAME `SearchHit[]`, so a caller never branches on which ran.
 * Never throws.
 */
export const ragSearch =
  (db: Db, embedder: Option<Embedder>) =>
  (
    rawQuery: SoftStr,
    k: number,
  ): PromisedResult<
    ReadonlyArray<SearchHit>,
    SqlError | InvalidError | Defect
  > =>
    semanticSearch<
      SearchHit,
      SqlError | InvalidError | Defect
    >({
      embedder,
      loadCandidates: () =>
        loadEmbeddedHits(db),
      ftsFallback: () =>
        searchIndex(db)(rawQuery, k),
    })(rawQuery, k);
