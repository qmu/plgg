/**
 * The single reuse seam onto PoC 1's proven FTS arm —
 * the same seam PoC 2 established: heading-path
 * chunking, the inverted-index builder, and BM25
 * ranking, all pure and zero-network. Imported
 * RELATIVELY on purpose: a relative specifier is the one
 * spelling that resolves identically for tsc, node's
 * type-stripping (the entrypoints), the plgg-test
 * runner, and plgg-bundle's app inlining. The `file:`
 * dependency in package.json declares the coupling;
 * every other module here imports this seam, never
 * PoC 1 directly.
 */
export {
  searchFts,
  type Scored,
} from "../../plgg-poc1-search/src/search/fts.ts";
export {
  buildFtsIndex,
  type FtsIndex,
  type ChunkMeta,
} from "../../plgg-poc1-search/src/indexer/buildFts.ts";
export { chunkMarkdown } from "../../plgg-poc1-search/src/indexer/chunk.ts";
