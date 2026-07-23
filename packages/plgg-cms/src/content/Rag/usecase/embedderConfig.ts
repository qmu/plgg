import {
  type Option,
  type SoftStr,
  ok,
  err,
  some,
  none,
  isErr,
  isNone,
  matchOption,
  defect,
  cast,
  asRawObj,
  asVec,
  asVecOf,
  asNum,
  forProp,
} from "plgg";
import { type Embedding } from "plgg-cms/content/Rag/model/Embedding";
import { type Embedder } from "plgg-cms/content/Rag/model/Embedder";

/**
 * Config for the real embedding provider. `apiKey` is the ONLY
 * gate: absent → no {@link Embedder}, and search degrades to
 * FTS5 (D11). `endpoint`/`model` name an OpenAI-shaped
 * embeddings API.
 */
export type EmbedderConfig = Readonly<{
  apiKey: Option<SoftStr>;
  endpoint: SoftStr;
  model: SoftStr;
}>;

/** Pull `data[0].embedding` out of an OpenAI-shaped response, fail-closed. */
const parseVec = (
  json: unknown,
): Option<Embedding> => {
  const outer = cast(
    json,
    asRawObj,
    forProp("data", asVec),
  );
  if (isErr(outer)) {
    return none();
  }
  const first = outer.content.data[0];
  if (first === undefined) {
    return none();
  }
  const inner = cast(
    first,
    asRawObj,
    forProp("embedding", asVecOf(asNum)),
  );
  return isErr(inner)
    ? none()
    : some(inner.content.embedding);
};

/**
 * The REAL network {@link Embedder} — a `fetch` to an
 * OpenAI-shaped embeddings endpoint. Node-only seam,
 * coverage-excluded; every failure (transport, non-2xx, or an
 * unparseable body) becomes a `Defect` so {@link semanticSearch}
 * degrades to FTS5 rather than surfacing an error.
 */
export const fetchEmbedder = (
  apiKey: SoftStr,
  endpoint: SoftStr,
  model: SoftStr,
): Embedder => ({
  embed: async (text: SoftStr) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: text,
        }),
      });
      if (!res.ok) {
        return err(
          defect(
            `embeddings HTTP ${res.status}`,
          ),
        );
      }
      const vec = parseVec(await res.json());
      return isNone(vec)
        ? err(
            defect(
              "no embedding in the response",
            ),
          )
        : ok(vec.content);
    } catch (cause) {
      return err(
        defect(
          "embeddings request failed",
          cause,
        ),
      );
    }
  },
});

/**
 * Build the `Option<Embedder>` search runs on. `Some` only when
 * an `apiKey` is configured — the single graceful-degradation
 * gate: no key → `None` → FTS5-only (D11). The whole CMS works
 * with this returning `None`.
 */
export const embedderFromConfig = (
  config: EmbedderConfig,
): Option<Embedder> =>
  matchOption<SoftStr, Option<Embedder>>(
    () => none(),
    (key: SoftStr) =>
      some(
        fetchEmbedder(
          key,
          config.endpoint,
          config.model,
        ),
      ),
  )(config.apiKey);
