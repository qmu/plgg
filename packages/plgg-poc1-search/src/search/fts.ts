/**
 * The from-scratch browser full-text arm: BM25 ranking
 * over the shipped inverted index. Zero dependencies —
 * this is the "implement by default" side of the PoC's
 * comparison, judged against plgg-cms's server FTS5/BM25
 * as the quality baseline. Query strings go through the
 * shared {@link tokenize}, so the accepted query grammar
 * is total by construction (no raw string reaches the
 * ranking — the FTS5 sanitizer lesson from the server
 * work).
 */
import type { SoftStr } from "plgg";
import type {
  FtsIndex,
  Posting,
} from "../indexer/buildFts.ts";
import { tokenize } from "./tokenize.ts";

export type Scored = Readonly<{
  id: number;
  score: number;
}>;

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
 * best first, top `k`. An empty or all-noise query ranks
 * nothing (the UI renders that as its designed empty
 * state, not as an error).
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
      .map(
        ([id, score]): Scored => ({ id, score }),
      )
      .sort((x, y) => y.score - x.score)
      .slice(0, Math.max(k, 0));
  };
