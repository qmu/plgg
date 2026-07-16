import { SoftStr } from "plgg";
import { CjkStrategy } from "plgg-search/domain/model/CjkStrategy";

/**
 * One indexed chunk's metadata, text included — the
 * shipped index doubles as the snippet source, so a
 * result renders without a second fetch.
 */
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

/**
 * The browser-shippable full-text index: chunk
 * metadata, an inverted `term → [chunkId, tf]`
 * postings map, and the average token length BM25
 * needs. Pure data — the build step writes it as
 * JSON and the browser fetches the same shape back.
 */
export type FtsIndex = Readonly<{
  chunks: ReadonlyArray<ChunkMeta>;
  postings: Readonly<
    Record<string, ReadonlyArray<Posting>>
  >;
  avgLen: number;
  /**
   * The CJK tokenization the index was built under —
   * carried so query time tokenizes identically (the
   * shared-tokenizer invariant, made
   * un-mismatchable).
   */
  cjk: CjkStrategy;
}>;

/** One ranked hit: a chunk id and its BM25 score. */
export type Scored = Readonly<{
  id: number;
  score: number;
}>;
