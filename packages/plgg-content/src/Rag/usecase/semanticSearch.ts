import {
  type Option,
  type SoftStr,
  type PromisedResult,
  type Defect,
  ok,
  proc,
  matchOption,
  matchResult,
} from "plgg";
import { type Embedder } from "plgg-content/Rag/model/Embedder";
import {
  type Candidate,
  topK,
} from "plgg-content/Rag/usecase/similarity";

/**
 * The dependencies a semantic search folds over, all injected
 * so the orchestration is pure control-flow and unit-testable:
 * an `Option<Embedder>` (None = no key), a loader for the
 * embedded candidates, and the FTS5/BM25 fallback (ticket 16).
 */
export type SearchDeps<Id> = Readonly<{
  embedder: Option<Embedder>;
  loadCandidates: () => PromisedResult<
    ReadonlyArray<Candidate<Id>>,
    Defect
  >;
  ftsFallback: () => PromisedResult<
    ReadonlyArray<Id>,
    Defect
  >;
}>;

/**
 * Hybrid retrieval with GRACEFUL DEGRADATION (D11). The chain
 * falls back to FTS5/BM25 at every point embeddings can't
 * serve:
 *
 * - no {@link Embedder} configured (no key) → FTS5;
 * - `embed` fails (network/quota) → FTS5 (the error is caught,
 *   never surfaced as a search failure);
 * - no embedded candidates yet → FTS5;
 * - otherwise → cosine {@link topK} over the candidates.
 *
 * So an operator who never configures a key still gets sane
 * keyword results — the CMS's zero-dependency identity holds.
 * Never throws.
 */
export const semanticSearch =
  <Id>(deps: SearchDeps<Id>) =>
  (
    query: SoftStr,
    k: number,
  ): PromisedResult<
    ReadonlyArray<Id>,
    Defect
  > =>
    matchOption<
      Embedder,
      PromisedResult<
        ReadonlyArray<Id>,
        Defect
      >
    >(
      () => deps.ftsFallback(),
      (embedder: Embedder) =>
        embedder.embed(query).then(
          matchResult<
            ReadonlyArray<number>,
            Defect,
            PromisedResult<
              ReadonlyArray<Id>,
              Defect
            >
          >(
            () => deps.ftsFallback(),
            (queryVec) =>
              proc(
                deps.loadCandidates(),
                (
                  candidates: ReadonlyArray<
                    Candidate<Id>
                  >,
                ) =>
                  candidates.length === 0
                    ? deps.ftsFallback()
                    : ok(
                        topK(
                          queryVec,
                          candidates,
                          k,
                        ).map((s) => s.id),
                      ),
              ),
          ),
        ),
    )(deps.embedder);
