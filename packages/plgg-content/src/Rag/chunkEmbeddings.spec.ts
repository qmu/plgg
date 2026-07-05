import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { type Result, isErr } from "plgg";
import { sql, exec } from "plgg-sql";
import { openIndex } from "plgg-content/Schema/usecase/openIndex";
import {
  saveChunkEmbedding,
  loadEmbeddedChunks,
} from "plgg-content/Rag/usecase/chunkEmbeddings";

const must = <T>(
  r: Result<T, unknown>,
): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const seedTwoChunks = async () => {
  const db = must(await openIndex(":memory:"));
  must(
    await exec(db)(
      sql`INSERT INTO documents (collection, path, content_hash, attributes_json, updated_at) VALUES ('c', 'p.md', 'h', '{}', 't')`,
    ),
  );
  must(
    await exec(db)(
      sql`INSERT INTO chunks (document_id, ordinal, heading_path, text) VALUES (1, 0, 'A', 'chunk one')`,
    ),
  );
  must(
    await exec(db)(
      sql`INSERT INTO chunks (document_id, ordinal, heading_path, text) VALUES (1, 1, 'B', 'chunk two')`,
    ),
  );
  return db;
};

test("saveChunkEmbedding + loadEmbeddedChunks round-trips only embedded rows", async () => {
  const db = await seedTwoChunks();
  // embed chunk 1 only
  must(
    await saveChunkEmbedding(db)(1, [0.1, 0.2, 0.3]),
  );
  const cands = must(
    await loadEmbeddedChunks(db),
  );
  return all([
    // chunk 2 (no embedding) is excluded
    check(cands.length, toBe(1)),
    check(cands[0]?.id ?? 0, toBe(1)),
    check(
      cands[0]?.embedding.length ?? 0,
      toBe(3),
    ),
    check(
      cands[0]?.embedding[0] ?? 0,
      toBe(0.1),
    ),
  ]);
});

test("a re-embed overwrites the vector", async () => {
  const db = await seedTwoChunks();
  must(await saveChunkEmbedding(db)(1, [1, 0]));
  must(await saveChunkEmbedding(db)(1, [0, 1]));
  const cands = must(
    await loadEmbeddedChunks(db),
  );
  return all([
    check(cands.length, toBe(1)),
    check(
      cands[0]?.embedding[1] ?? 0,
      toBe(1),
    ),
  ]);
});

test("with nothing embedded, loadEmbeddedChunks is empty (FTS5 fallback territory)", async () => {
  const db = await seedTwoChunks();
  const cands = must(
    await loadEmbeddedChunks(db),
  );
  return check(cands.length, toBe(0));
});

test("a corrupt stored embedding fails closed (not a silent bad vector)", async () => {
  const db = await seedTwoChunks();
  must(
    await exec(db)(
      sql`UPDATE chunks SET embedding = 'not-json' WHERE id = 1`,
    ),
  );
  const loaded = await loadEmbeddedChunks(db);
  return check(isErr(loaded), toBe(true));
});
