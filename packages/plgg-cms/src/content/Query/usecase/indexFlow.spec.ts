import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  type SoftStr,
  isErr,
  isOk,
  isSome,
  some,
  none,
  matchOption,
} from "plgg";
import { heading, para } from "plgg-md";
import { type Document } from "plgg-cms/content/Ingest/model/Document";
import {
  openIndex,
  initSchema,
} from "plgg-cms/content/Schema/usecase/openIndex";
import {
  type IndexInput,
  indexDocument,
} from "plgg-cms/content/Ingest/usecase/indexDocument";
import { rebuildIndex } from "plgg-cms/content/Ingest/usecase/rebuildIndex";
import { registerCollection } from "plgg-cms/content/Query/usecase/registerCollection";
import { getDocument } from "plgg-cms/content/Query/usecase/getDocument";
import { listCollection } from "plgg-cms/content/Query/usecase/listCollection";
import { searchIndex } from "plgg-cms/content/Query/usecase/searchIndex";
import {
  collectionSchema,
  schemaField,
} from "plgg-cms/content/Query/model/CollectionSchema";
import { asListQuery } from "plgg-cms/content/Query/model/ListQuery";
import { type Db } from "plgg-sql";

// test-only unwrap: a failed step fails the test loudly.
const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const doc = (
  path: SoftStr,
  title: SoftStr,
  hash: SoftStr,
  bodyWord: SoftStr,
): IndexInput => ({
  collection: "blog",
  path,
  title: some(title),
  attributesJson: '{"draft":false}',
  blocks: [
    heading(1, title),
    para(`${bodyWord} content here`),
  ],
  contentHash: hash,
  updatedAt: "2026-01-01T00:00:00Z",
});

const seed = async (): Promise<Db> => {
  const db = must(await openIndex(":memory:"));
  must(
    await registerCollection(db)(
      collectionSchema("blog", [
        schemaField("draft", "boolean", true),
      ]),
    ),
  );
  must(
    await indexDocument(db)(
      doc("/blog/a", "Alpha", "h-a", "kangaroo"),
    ),
  );
  must(
    await indexDocument(db)(
      doc("/blog/b", "Beta", "h-b", "penguin"),
    ),
  );
  return db;
};

test("initSchema is idempotent (a second run is a no-op)", async () => {
  const db = must(await openIndex(":memory:"));
  const again = await initSchema(db);
  return check(isOk(again), toBe(true));
});

test("getDocument returns a stored page with parsed attributes", async () => {
  const db = await seed();
  const found = must(
    await getDocument(db)("blog", "/blog/a"),
  );
  return all([
    check(isSome(found), toBe(true)),
    check(
      matchOption(
        () => "",
        (d: { title: unknown }) =>
          JSON.stringify(d.title),
      )(found),
      toBe('{"__tag":"Some","content":"Alpha"}'),
    ),
  ]);
});

test("a titleless page round-trips its title as None", async () => {
  const db = must(await openIndex(":memory:"));
  must(
    await indexDocument(db)({
      collection: "blog",
      path: "/blog/untitled",
      title: none(),
      attributesJson: "{}",
      blocks: [para("bodyonly")],
      contentHash: "h-u",
      updatedAt: "2026-01-01T00:00:00Z",
    }),
  );
  const found = must(
    await getDocument(db)(
      "blog",
      "/blog/untitled",
    ),
  );
  return check(
    matchOption(
      () => "missing",
      (d: Document) =>
        isSome(d.title) ? "some" : "none",
    )(found),
    toBe("none"),
  );
});

test("getDocument is None for an unknown path", async () => {
  const db = await seed();
  const found = must(
    await getDocument(db)("blog", "/blog/zzz"),
  );
  return check(isSome(found), toBe(false));
});

test("listCollection pages and counts the collection", async () => {
  const db = await seed();
  const q = must(asListQuery({ limit: "10" }));
  const result = must(
    await listCollection(db)("blog", q),
  );
  return all([
    check(result.totalCount, toBe(2)),
    check(result.contents.length, toBe(2)),
    check(result.limit, toBe(10)),
  ]);
});

test("listCollection with q FTS-filters to matching documents", async () => {
  const db = await seed();
  const q = must(asListQuery({ q: "kangaroo" }));
  const result = must(
    await listCollection(db)("blog", q),
  );
  return all([
    check(result.totalCount, toBe(1)),
    check(result.contents.length, toBe(1)),
    check(
      result.contents[0]?.path ?? "",
      toBe("/blog/a"),
    ),
  ]);
});

test("searchIndex finds a document by its body text", async () => {
  const db = await seed();
  const hits = must(
    await searchIndex(db)("penguin", 5),
  );
  return all([
    check(hits.length, toBe(1)),
    check(
      hits[0]?.document.path ?? "",
      toBe("/blog/b"),
    ),
  ]);
});

test("indexDocument is idempotent on an unchanged content hash", async () => {
  const db = await seed();
  const changed = must(
    await indexDocument(db)(
      doc("/blog/a", "Alpha", "h-a", "kangaroo"),
    ),
  );
  return check(changed, toBe(false));
});

test("re-ingesting with a new hash updates the document", async () => {
  const db = await seed();
  const changed = must(
    await indexDocument(db)(
      doc("/blog/a", "Alpha", "h-a2", "wombat"),
    ),
  );
  const hits = must(
    await searchIndex(db)("wombat", 5),
  );
  return all([
    check(changed, toBe(true)),
    check(hits.length, toBe(1)),
  ]);
});

test("rebuildIndex prunes documents no longer in the corpus", async () => {
  const db = await seed();
  const report = must(
    await rebuildIndex(db)([
      doc("/blog/a", "Alpha", "h-a", "kangaroo"),
    ]),
  );
  const q = must(asListQuery({}));
  const result = must(
    await listCollection(db)("blog", q),
  );
  return all([
    check(report.pruned, toBe(1)),
    check(result.totalCount, toBe(1)),
  ]);
});

test("rebuildIndex with an empty corpus prunes everything", async () => {
  const db = await seed();
  const report = must(await rebuildIndex(db)([]));
  const q = must(asListQuery({}));
  const result = must(
    await listCollection(db)("blog", q),
  );
  return all([
    check(report.pruned, toBe(2)),
    check(result.totalCount, toBe(0)),
  ]);
});

test("a dropped index rebuilds to the same content (D4 recoverability)", async () => {
  const fresh = must(await openIndex(":memory:"));
  const report = must(
    await rebuildIndex(fresh)([
      doc("/blog/a", "Alpha", "h-a", "kangaroo"),
      doc("/blog/b", "Beta", "h-b", "penguin"),
    ]),
  );
  return check(report.indexed, toBe(2));
});

// a whitespace/garbage FTS query must not crash (fts5Phrase guard)
test("searchIndex tolerates metacharacter queries", async () => {
  const db = await seed();
  const hits = await searchIndex(db)(
    '"(AND* ',
    5,
  );
  return check(isOk(hits), toBe(true));
});
