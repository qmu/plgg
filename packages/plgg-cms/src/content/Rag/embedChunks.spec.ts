import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  isErr,
  ok,
  err,
  defect,
} from "plgg";
import { type Embedder } from "plgg-cms/content/Rag/model/Embedder";
import { openIndex } from "plgg-cms/content/Schema/usecase/openIndex";
import { sql, exec } from "plgg-sql";
import { loadEmbeddedChunks } from "plgg-cms/content/Rag/usecase/chunkEmbeddings";
import { embedPendingChunks } from "plgg-cms/content/Rag/usecase/embedChunks";

const must = <T>(
  r: Result<T, unknown>,
): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const okEmbedder: Embedder = {
  embed: async () => ok([0.1, 0.2]),
};
const failEmbedder: Embedder = {
  embed: async () => err(defect("boom")),
};

const seed = async () => {
  const db = must(await openIndex(":memory:"));
  must(
    await exec(db)(
      sql`INSERT INTO documents (id, collection, path, content_hash, attributes_json, updated_at) VALUES (1, 'g', 'p.md', 'h', '{}', 't')`,
    ),
  );
  must(
    await exec(db)(
      sql`INSERT INTO chunks (id, document_id, ordinal, heading_path, text) VALUES (1, 1, 0, 'A', 'one')`,
    ),
  );
  must(
    await exec(db)(
      sql`INSERT INTO chunks (id, document_id, ordinal, heading_path, text) VALUES (2, 1, 1, 'B', 'two')`,
    ),
  );
  return db;
};

test("embeds all pending chunks and reports the count", async () => {
  const db = await seed();
  const n = must(
    await embedPendingChunks(db, okEmbedder)(),
  );
  const cands = must(
    await loadEmbeddedChunks(db),
  );
  return all([
    check(n, toBe(2)),
    check(cands.length, toBe(2)),
  ]);
});

test("a failing provider embeds nothing (count 0, corpus stays FTS5)", async () => {
  const db = await seed();
  const n = must(
    await embedPendingChunks(db, failEmbedder)(),
  );
  const cands = must(
    await loadEmbeddedChunks(db),
  );
  return all([
    check(n, toBe(0)),
    check(cands.length, toBe(0)),
  ]);
});

test("already-embedded chunks are skipped on re-run (idempotent)", async () => {
  const db = await seed();
  must(
    await embedPendingChunks(db, okEmbedder)(),
  );
  const second = must(
    await embedPendingChunks(db, okEmbedder)(),
  );
  return check(second, toBe(0));
});
