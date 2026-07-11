/**
 * Chunks → the browser-shippable full-text index: chunk
 * metadata (with text, for result snippets — the corpus
 * is ~121 KB so shipping it whole is the point being
 * measured), an inverted `term → [chunkId, tf]` postings
 * map, and the average token length BM25 needs. Pure:
 * the node entrypoint feeds it file contents and writes
 * the JSON; the browser fetches the same shape back.
 */
import type { SoftStr } from "plgg";
import type { ChunkSeed } from "./chunk.ts";
import {
  type CjkStrategy,
  tokenize,
} from "../search/tokenize.ts";

export type ChunkMeta = Readonly<{
  id: number;
  file: SoftStr;
  headingPath: SoftStr;
  text: SoftStr;
  /** Token count (BM25 length normalization). */
  len: number;
}>;

/** `[chunkId, termFrequency]` */
export type Posting = readonly [number, number];

export type FtsIndex = Readonly<{
  chunks: ReadonlyArray<ChunkMeta>;
  postings: Readonly<
    Record<string, ReadonlyArray<Posting>>
  >;
  avgLen: number;
  /**
   * The CJK tokenization the index was built under —
   * carried so query time tokenizes identically (the
   * shared-tokenizer invariant, made un-mismatchable).
   */
  cjk: CjkStrategy;
}>;

/** Tokens a chunk is indexed under: heading + body. */
export const chunkTokens = (
  chunk: ChunkSeed,
  strategy: CjkStrategy = "none",
): ReadonlyArray<SoftStr> =>
  tokenize(
    `${chunk.headingPath} ${chunk.text}`,
    strategy,
  );

export const buildFtsIndex = (
  seeds: ReadonlyArray<ChunkSeed>,
  strategy: CjkStrategy = "none",
): FtsIndex => {
  // Index assembly is the one irreducible imperative
  // seam here: a Map-accumulated postings table (and a
  // per-chunk tf Map) instead of quadratic spread-folds
  // over hundreds of chunks × thousands of terms.
  const postings = new Map<string, Array<Posting>>();
  const chunks: Array<ChunkMeta> = [];
  let totalLen = 0;
  for (const [id, seed] of seeds.entries()) {
    const tokens = chunkTokens(seed, strategy);
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }
    for (const [term, count] of tf) {
      const row = postings.get(term) ?? [];
      row.push([id, count]);
      postings.set(term, row);
    }
    chunks.push({
      id,
      file: seed.file,
      headingPath: seed.headingPath,
      text: seed.text,
      len: tokens.length,
    });
    totalLen += tokens.length;
  }
  return {
    chunks,
    postings: Object.fromEntries(postings),
    avgLen:
      chunks.length === 0
        ? 0
        : totalLen / chunks.length,
    cjk: strategy,
  };
};
