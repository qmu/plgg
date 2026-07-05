import { type Embedding } from "plgg-content/Rag/model/Embedding";

/**
 * Cosine similarity of two {@link Embedding}s in [-1, 1]. Pure
 * JS (D11 — no native vector op). Returns 0 for a dimension
 * mismatch or a zero-magnitude vector, so an unembedded or
 * malformed candidate simply never ranks rather than throwing.
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

/** One candidate to rank: an opaque id + its stored vector. */
export type Candidate<Id> = Readonly<{
  id: Id;
  embedding: Embedding;
}>;

/** A ranked hit: the candidate id + its cosine score. */
export type Scored<Id> = Readonly<{
  id: Id;
  score: number;
}>;

/**
 * Rank `candidates` against `queryVec` by cosine and return the
 * top `k`, highest score first. Pure and total — a stable
 * insertion order is preserved for ties, and `k <= 0` yields an
 * empty result. This IS the "opt-in embeddings = JS cosine
 * top-k" retrieval of D11.
 */
export const topK = <Id>(
  queryVec: Embedding,
  candidates: ReadonlyArray<Candidate<Id>>,
  k: number,
): ReadonlyArray<Scored<Id>> =>
  k <= 0
    ? []
    : candidates
        .map(
          (c): Scored<Id> => ({
            id: c.id,
            score: cosineSimilarity(
              queryVec,
              c.embedding,
            ),
          }),
        )
        .slice()
        .sort((x, y) => y.score - x.score)
        .slice(0, k);
