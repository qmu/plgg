import {
  test,
  check,
  toBe,
} from "plgg-test";
import {
  type Result,
  type Option,
  isErr,
  ok,
  err,
  some,
  none,
  defect,
} from "plgg";
import { type Embedding } from "plgg-content/Rag/model/Embedding";
import { type Embedder } from "plgg-content/Rag/model/Embedder";
import { type Candidate } from "plgg-content/Rag/usecase/similarity";
import {
  type SearchDeps,
  semanticSearch,
} from "plgg-content/Rag/usecase/semanticSearch";

const must = <T>(
  r: Result<T, unknown>,
): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const FTS = ["fts1", "fts2"];

const deps = (opts: {
  embedder: Option<Embedder>;
  candidates?: ReadonlyArray<Candidate<string>>;
}): SearchDeps<string> => ({
  embedder: opts.embedder,
  loadCandidates: async () =>
    ok(opts.candidates ?? []),
  ftsFallback: async () => ok(FTS),
});

const okEmbedder = (
  vec: Embedding,
): Option<Embedder> =>
  some({ embed: async () => ok(vec) });

const failEmbedder = (): Option<Embedder> =>
  some({
    embed: async () => err(defect("boom")),
  });

test("no embedder configured degrades to FTS5", async () => {
  const r = must(
    await semanticSearch(
      deps({ embedder: none() }),
    )("q", 5),
  );
  return check(r.join(","), toBe("fts1,fts2"));
});

test("embedder + embedded candidates → cosine top-k", async () => {
  const r = must(
    await semanticSearch(
      deps({
        embedder: okEmbedder([1, 0]),
        candidates: [
          { id: "a", embedding: [0, 1] },
          { id: "b", embedding: [1, 0] },
        ],
      }),
    )("q", 1),
  );
  return check(r.join(","), toBe("b"));
});

test("an embed failure degrades to FTS5 (never a search error)", async () => {
  const r = must(
    await semanticSearch(
      deps({
        embedder: failEmbedder(),
        candidates: [
          { id: "a", embedding: [1, 0] },
        ],
      }),
    )("q", 5),
  );
  return check(r.join(","), toBe("fts1,fts2"));
});

test("no embedded candidates yet degrades to FTS5", async () => {
  const r = must(
    await semanticSearch(
      deps({
        embedder: okEmbedder([1, 0]),
        candidates: [],
      }),
    )("q", 5),
  );
  return check(r.join(","), toBe("fts1,fts2"));
});
