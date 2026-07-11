/**
 * The Japanese CJK-tokenizer measurement (Ticket B),
 * precomputed at build time and shipped as one small JSON
 * the page renders. It answers, on the REAL qmu.co.jp
 * Japanese policy corpus (vendored under `corpus-ja/` so
 * the measurement is reproducible without `../qmu-co-jp`),
 * two questions: how much does indexing Japanese cost
 * under each tokenizer, and is the retrieval any good.
 *
 * Three arms are compared: the latin-only baseline
 * (`"none"` — indexes Japanese to ~0 tokens, the honest
 * failure the current tokenizer has), `Intl.Segmenter`
 * word segmentation, and character bigrams. Producer:
 * `entrypoints/buildIndex.ts`. Consumer: `app.ts` /
 * `view.ts`.
 */
import type { SoftStr } from "plgg";
import type { CjkStrategy } from "./search/tokenize.ts";

/** One tokenizer arm's measured index cost. */
export type JaArm = Readonly<{
  strategy: CjkStrategy;
  /** `fts.json` byte size for this arm. */
  ftsBytes: number;
  /** Distinct indexed terms (postings keys). */
  vocab: number;
  /** Total indexed tokens across all chunks. */
  tokens: number;
  buildMs: number;
}>;

/** One retrieved chunk for a canned query. */
export type JaHit = Readonly<{
  headingPath: SoftStr;
  score: number;
}>;

/** A canned Japanese query and its top hits per arm. */
export type JaQueryRow = Readonly<{
  query: SoftStr;
  hits: Readonly<
    Record<CjkStrategy, ReadonlyArray<JaHit>>
  >;
}>;

export type JaReport = Readonly<{
  corpus: Readonly<{
    files: number;
    chunks: number;
    bytes: number;
  }>;
  arms: ReadonlyArray<JaArm>;
  queries: ReadonlyArray<JaQueryRow>;
}>;
