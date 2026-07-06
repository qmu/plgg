import {
  test,
  check,
  all,
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
import { openIndex } from "plgg-content/Schema/usecase/openIndex";
import { sql, exec } from "plgg-sql";
import { saveChunkEmbedding } from "plgg-content/Rag/usecase/chunkEmbeddings";
import { ragSearch } from "plgg-content/Rag/usecase/ragSearch";

const must = <T>(
  r: Result<T, unknown>,
): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const seed = async () => {
  const db = must(await openIndex(":memory:"));
  must(
    await exec(db)(
      sql`INSERT INTO documents (id, collection, path, content_hash, attributes_json, updated_at) VALUES (1, 'guide', 'alpha.md', 'h1', '{}', 't')`,
    ),
  );
  must(
    await exec(db)(
      sql`INSERT INTO documents (id, collection, path, content_hash, attributes_json, updated_at) VALUES (2, 'guide', 'delta.md', 'h2', '{}', 't')`,
    ),
  );
  must(
    await exec(db)(
      sql`INSERT INTO chunks (id, document_id, ordinal, heading_path, text) VALUES (1, 1, 0, 'Intro', 'alpha bravo charlie')`,
    ),
  );
  must(
    await exec(db)(
      sql`INSERT INTO chunks (id, document_id, ordinal, heading_path, text) VALUES (2, 2, 0, 'Intro', 'delta echo foxtrot')`,
    ),
  );
  return db;
};

const embedderOf = (
  vec: Embedding,
): Option<Embedder> =>
  some({ embed: async () => ok(vec) });

test("no embedder → FTS5/BM25 path finds the keyword match", async () => {
  const db = await seed();
  const hits = must(
    await ragSearch(db, none())("alpha", 5),
  );
  return all([
    check(hits.length, toBe(1)),
    check(hits[0]?.document.id ?? 0, toBe(1)),
  ]);
});

test("embedder + embedded chunks cosine-re-ranks across documents", async () => {
  const db = await seed();
  must(await saveChunkEmbedding(db)(1, [1, 0]));
  must(await saveChunkEmbedding(db)(2, [0, 1]));
  // a query vector closest to chunk 2 → doc 2 ranks first
  const hits = must(
    await ragSearch(db, embedderOf([0, 1]))(
      "irrelevant",
      5,
    ),
  );
  return all([
    check(hits.length, toBe(2)),
    check(hits[0]?.document.id ?? 0, toBe(2)),
    check(hits[1]?.document.id ?? 0, toBe(1)),
  ]);
});

test("an embed failure degrades to FTS5", async () => {
  const db = await seed();
  must(await saveChunkEmbedding(db)(1, [1, 0]));
  const failing: Option<Embedder> = some({
    embed: async () => err(defect("boom")),
  });
  const hits = must(
    await ragSearch(db, failing)("alpha", 5),
  );
  return all([
    check(hits.length, toBe(1)),
    check(hits[0]?.document.id ?? 0, toBe(1)),
  ]);
});
