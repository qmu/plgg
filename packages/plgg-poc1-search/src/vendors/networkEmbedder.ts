/**
 * The OpenAI-shaped network embedder — the PoC's second
 * query-embedding option, mirroring plgg-cms's
 * `embedderConfig` (a fetch to `/embeddings`, gated on an
 * API key). Sovereignty note (data-sovereignty policy):
 * this path sends the query (or, at build time, the whole
 * corpus) to the provider — the PoC's findings must state
 * that trade-off wherever this arm is measured. Built
 * WITHOUT a key, the app shows the arm's honest
 * "unavailable" state instead.
 *
 * Vectors from this embedder live in the provider's
 * space: they pair ONLY with an embeddings asset built by
 * the same model (`embeddings-openai.json`), never with
 * the local MiniLM asset.
 */
import {
  type SoftStr,
  type Result,
  ok,
  err,
} from "plgg";
import type { Embedding } from "../search/rag.ts";
import type { Embedder } from "../search/embedder.ts";
import { isObj, toError } from "./moduleShape.ts";

export const OPENAI_EMBEDDING_MODEL =
  "text-embedding-3-small";

const embeddingOf = (
  body: unknown,
): Result<Embedding, Error> => {
  const rows =
    isObj(body) && Array.isArray(body["data"])
      ? body["data"]
      : [];
  const first: unknown = rows[0];
  const vector =
    isObj(first) &&
    Array.isArray(first["embedding"])
      ? first["embedding"]
      : [];
  return vector.length > 0 &&
    vector.every(
      (n) => typeof n === "number",
    )
    ? ok(vector)
    : err(
        new Error(
          "embeddings response carries no vector",
        ),
      );
};

export const makeNetworkEmbedder = (
  endpoint: SoftStr,
  apiKey: SoftStr,
): Embedder =>
(text) =>
  fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: text,
    }),
  }).then(
    (
      res,
    ): Promise<Result<Embedding, Error>> =>
      res.ok
        ? res.json().then(embeddingOf)
        : Promise.resolve(
            err(
              new Error(
                `embeddings endpoint answered ${res.status}`,
              ),
            ),
          ),
    (cause): Result<Embedding, Error> =>
      err(
        toError("embeddings request failed")(
          cause,
        ),
      ),
  );
