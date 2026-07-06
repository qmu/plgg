import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { type Result, isErr, none } from "plgg";
import {
  openIndex,
  registerCollection,
  collectionSchema,
  schemaField,
  openDb,
} from "plgg-content";
import { sql, exec } from "plgg-sql";
import {
  searchContentTool,
  getArticleTool,
  listCollectionsTool,
  contentTools,
} from "plgg-mcp/Tools/contentTools";

const must = <T>(
  r: Result<T, unknown>,
): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const seed = async () => {
  const db = must(
    await openIndex(":memory:"),
  );
  must(
    await registerCollection(db)(
      collectionSchema("blog", [
        schemaField("draft", "boolean", true),
      ]),
    ),
  );
  must(
    await exec(db)(
      sql`INSERT INTO documents (id, collection, path, title, content_hash, attributes_json, updated_at) VALUES (1, 'blog', '/blog/a', 'Alpha', 'h', '{}', 't')`,
    ),
  );
  must(
    await exec(db)(
      sql`INSERT INTO chunks (document_id, ordinal, heading_path, text) VALUES (1, 0, 'Intro', 'kangaroo bravo charlie')`,
    ),
  );
  return db;
};

test("search_content finds a matching document; a missing query is an isError result", async () => {
  const db = await seed();
  const hit = must(
    await searchContentTool(db, none()).call({
      query: "kangaroo",
    }),
  );
  const noQuery = must(
    await searchContentTool(db, none()).call({}),
  );
  return all([
    check(hit.isError, toBe(false)),
    check(
      (hit.content[0]?.text ?? "").includes(
        "/blog/a",
      ),
      toBe(true),
    ),
    check(noQuery.isError, toBe(true)),
  ]);
});

test("get_article fetches a doc; missing args and an absent doc are isError", async () => {
  const db = await seed();
  const found = must(
    await getArticleTool(db).call({
      collection: "blog",
      path: "/blog/a",
    }),
  );
  const missing = must(
    await getArticleTool(db).call({}),
  );
  const absent = must(
    await getArticleTool(db).call({
      collection: "blog",
      path: "/blog/zzz",
    }),
  );
  return all([
    check(found.isError, toBe(false)),
    check(
      (found.content[0]?.text ?? "").includes(
        "Alpha",
      ),
      toBe(true),
    ),
    check(missing.isError, toBe(true)),
    check(absent.isError, toBe(true)),
  ]);
});

test("list_collections lists the registered collection", async () => {
  const db = await seed();
  const res = must(
    await listCollectionsTool(db).call({}),
  );
  return all([
    check(res.isError, toBe(false)),
    check(
      (res.content[0]?.text ?? "").includes(
        "blog",
      ),
      toBe(true),
    ),
  ]);
});

test("contentTools assembles the three read-only tools", async () => {
  const db = await seed();
  const reg = contentTools(db, none());
  return all([
    check(reg.length, toBe(3)),
    check(
      reg[0]?.name ?? "",
      toBe("search_content"),
    ),
  ]);
});

test("a store error surfaces as an isError result, never a throw", async () => {
  const broken = openDb(":memory:");
  const search = must(
    await searchContentTool(broken, none()).call(
      { query: "x" },
    ),
  );
  const article = must(
    await getArticleTool(broken).call({
      collection: "c",
      path: "p",
    }),
  );
  const cols = must(
    await listCollectionsTool(broken).call({}),
  );
  return all([
    check(search.isError, toBe(true)),
    check(article.isError, toBe(true)),
    check(cols.isError, toBe(true)),
  ]);
});

test("search_content honours a numeric limit and clamps out-of-range values", async () => {
  const db = await seed();
  const withLimit = must(
    await searchContentTool(db, none()).call({
      query: "kangaroo",
      limit: 3,
    }),
  );
  const oversize = must(
    await searchContentTool(db, none()).call({
      query: "kangaroo",
      limit: 100,
    }),
  );
  return all([
    check(withLimit.isError, toBe(false)),
    check(oversize.isError, toBe(false)),
  ]);
});
