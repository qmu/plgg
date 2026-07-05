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
  ok,
  some,
} from "plgg";
import { heading, para } from "plgg-md";
import {
  type Db,
  openIndex,
  registerCollection,
  indexDocument,
  collectionSchema,
  schemaField,
} from "plgg-content";
import {
  type Source,
  type Row,
  type Path,
  schedule,
} from "plggmatic";
import { adminDeclaration } from "plggpress/Admin/adminDeclaration";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

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
    await indexDocument(db)({
      collection: "blog",
      path: "blog/hello.md",
      title: some("Hello"),
      attributesJson: '{"draft":false}',
      blocks: [heading(1, "Hello"), para("hi")],
      contentHash: "h1",
      updatedAt: "2026-01-01T00:00:00Z",
    }),
  );
  return db;
};

const drive = (
  source: Source,
  path: Path,
): Promise<Result<ReadonlyArray<Row>, Error>> =>
  source.__tag === "Async"
    ? source.content(path)
    : Promise.resolve(ok(source.content(path)));

const collectionById = (
  db: Db,
  id: SoftStr,
): Source => {
  const found = adminDeclaration(
    db,
  ).collections.find((c) => c.id === id);
  if (found === undefined) {
    throw new Error(`no collection ${id}`);
  }
  return found.source;
};

test("adminDeclaration schedules into a runnable program", async () => {
  const db = await seed();
  const scheduled = schedule(adminDeclaration(db));
  const [model] = scheduled.init({
    path: "/",
    search: "",
  });
  return all([
    check(typeof scheduled.init, toBe("function")),
    check(typeof scheduled.scene, toBe("function")),
    check(Array.isArray(model.slots), toBe(true)),
  ]);
});

test("the collections source lists the registered models", async () => {
  const db = await seed();
  const rows = must(
    await drive(
      collectionById(db, "collections"),
      [],
    ),
  );
  return all([
    check(rows.length, toBe(1)),
    check(rows[0]?.id ?? "", toBe("blog")),
  ]);
});

test("selecting a collection drills into its documents", async () => {
  const db = await seed();
  const rows = must(
    await drive(collectionById(db, "documents"), [
      "blog",
    ]),
  );
  return all([
    check(rows.length, toBe(1)),
    check(
      rows[0]?.label ?? "",
      toBe("Hello"),
    ),
  ]);
});

test("an unknown parent selection yields no documents", async () => {
  const db = await seed();
  const rows = must(
    await drive(collectionById(db, "documents"), [
      "does-not-exist",
    ]),
  );
  return check(rows.length, toBe(0));
});
