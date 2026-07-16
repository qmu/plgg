import { SoftStr } from "plgg";

/**
 * One heading-scoped slice of one source file — the
 * unit the index builder ingests and BM25 ranks.
 */
export type ChunkSeed = Readonly<{
  /** Repo-relative source, e.g. `concepts/option.md`. */
  file: SoftStr;
  /** Heading trail, e.g. `Option > Why not null`. */
  headingPath: SoftStr;
  text: SoftStr;
}>;
