/**
 * From-scratch BM25 ranking over the shipped
 * inverted index — zero dependencies, the
 * "implement by default" arm PoC 1 judged against
 * server FTS5/BM25 and shipped. Query strings go
 * through the shared {@link tokenize}, so the
 * accepted query grammar is total by construction
 * (no raw string reaches the ranking).
 */
import { SoftStr } from "plgg";
import {
  FtsIndex,
  Posting,
  Scored,
} from "plgg-search/domain/model/FtsIndex";
import { tokenize } from "plgg-search/domain/usecase/tokenize";

const K1 = 1.2;
const B = 0.75;

const idf = (
  totalChunks: number,
  docFreq: number,
): number =>
  Math.log(
    1 +
      (totalChunks - docFreq + 0.5) /
        (docFreq + 0.5),
  );

const bm25Term =
  (index: FtsIndex, termIdf: number) =>
  ([id, tf]: Posting): readonly [
    number,
    number,
  ] => {
    const len = index.chunks[id]?.len ?? 0;
    return [
      id,
      (termIdf * (tf * (K1 + 1))) /
        (tf +
          K1 *
            (1 -
              B +
              (B * len) /
                Math.max(index.avgLen, 1))),
    ];
  };

/**
 * Rank the index's chunks against a free-text query,
 * best first, top `k`. An empty or all-noise query
 * ranks nothing (a designed empty state, not an
 * error).
 */
export const searchFts =
  (index: FtsIndex) =>
  (
    query: SoftStr,
    k: number,
  ): ReadonlyArray<Scored> => {
    // Score accumulation over postings is the same
    // imperative seam as index assembly: a Map beats
    // spread-folding thousands of [id, score] pairs.
    const scores = new Map<number, number>();
    for (const term of tokenize(
      query,
      index.cjk,
    )) {
      const postings = index.postings[term];
      if (postings === undefined) continue;
      const termIdf = idf(
        index.chunks.length,
        postings.length,
      );
      for (const [id, score] of postings.map(
        bm25Term(index, termIdf),
      )) {
        scores.set(
          id,
          (scores.get(id) ?? 0) + score,
        );
      }
    }
    return [...scores.entries()]
      .map(([id, score]): Scored => ({
        id,
        score,
      }))
      .sort((x, y) => y.score - x.score)
      .slice(0, Math.max(k, 0));
  };
