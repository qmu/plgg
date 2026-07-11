/**
 * The vector arm's ranking core. `cosineSimilarity` and
 * `topK` are copied verbatim (ids specialized to the
 * chunk id `number`) from
 * `plgg-cms/src/content/Rag/usecase/similarity.ts` — 30
 * pure lines are not worth a runtime dependency from a
 * sacrificial PoC package onto the CMS (see the ticket's
 * Considerations). `Embedding` mirrors the plgg-cms wire
 * format: a plain JSON number array.
 */
import type { SoftStr } from "plgg";

export type Embedding = ReadonlyArray<number>;

/** `[chunkId, vector]` — the embeddings.json row shape. */
export type VectorRow = readonly [
  number,
  Embedding,
];

/** The embeddings.json asset the browser fetches. */
export type VectorIndex = Readonly<{
  model: SoftStr;
  dims: number;
  rows: ReadonlyArray<VectorRow>;
}>;

/**
 * Cosine similarity in [-1, 1]; 0 on dimension mismatch
 * or zero magnitude, so a malformed row never ranks.
 * (Provenance: plgg-cms similarity.ts, verbatim.)
 */
export const cosineSimilarity = (
  a: Embedding,
  b: Embedding,
): number => {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  a.forEach((av, i) => {
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  });
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
};

export type ScoredVector = Readonly<{
  id: number;
  score: number;
}>;

/**
 * Rank all vector rows against the query vector, top `k`
 * highest-cosine first. (Provenance: plgg-cms
 * similarity.ts `topK`, ids specialized to `number`.)
 */
export const topK = (
  queryVec: Embedding,
  rows: ReadonlyArray<VectorRow>,
  k: number,
): ReadonlyArray<ScoredVector> =>
  k <= 0
    ? []
    : rows
        .map(
          ([id, embedding]): ScoredVector => ({
            id,
            score: cosineSimilarity(
              queryVec,
              embedding,
            ),
          }),
        )
        .slice()
        .sort((x, y) => y.score - x.score)
        .slice(0, k);
