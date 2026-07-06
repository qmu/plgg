import {
  type SoftStr,
  type PromisedResult,
  type Defect,
} from "plgg";
import { type Embedding } from "plgg-content/Rag/model/Embedding";

/**
 * The embedding provider seam (ticket 24, D11) — injected, so
 * the RAG core never imports an SDK or names a network client.
 * The real implementation calls the configured LLM key; a test
 * passes a fake. It is held as an `Option<Embedder>`: `None`
 * means NO key is configured, and search degrades to ticket
 * 16's FTS5/BM25 path (graceful degradation is a hard D11
 * requirement, not a nicety). A failed `embed` (network/quota)
 * ALSO degrades — it never propagates as a search error.
 */
export type Embedder = Readonly<{
  embed: (
    text: SoftStr,
  ) => PromisedResult<Embedding, Defect>;
}>;
