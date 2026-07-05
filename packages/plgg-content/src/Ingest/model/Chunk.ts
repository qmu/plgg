import { type SoftStr } from "plgg";

/**
 * One heading-scoped slice of a document body — the RAG
 * granularity ticket 24 attaches embeddings to, and the
 * FTS5 row this package indexes. `ordinal` is the chunk's
 * position in the document (0-based); `headingPath` is the
 * ` > `-joined ancestor-heading breadcrumb (empty for the
 * pre-first-heading lead); `text` is the plain search
 * projection of the section's blocks.
 */
export type Chunk = Readonly<{
  ordinal: number;
  headingPath: SoftStr;
  text: SoftStr;
}>;
