/**
 * The one seam both embedding implementations fill —
 * mirroring plgg-cms's injected `Embedder` shape so the
 * orchestration stays pure and each vendor is a swap-in:
 * the in-browser local model
 * (`vendors/browserEmbedder.ts`), the node build-time
 * local model (`vendors/nodeEmbedder.ts`), and the
 * key-gated OpenAI-shaped network call
 * (`vendors/networkEmbedder.ts`).
 */
import type { SoftStr, Result } from "plgg";
import type { Embedding } from "./rag.ts";

export type Embedder = (
  text: SoftStr,
) => Promise<Result<Embedding, Error>>;

/**
 * The one model BOTH chunk vectors (build time) and query
 * vectors (query time) must come from — cosine between
 * different models' spaces is meaningless, so the model
 * id is a single shared constant, stamped into
 * embeddings.json and asserted before ranking.
 */
export const EMBEDDING_MODEL =
  "Xenova/all-MiniLM-L6-v2";

export const EMBEDDING_DIMS = 384;
