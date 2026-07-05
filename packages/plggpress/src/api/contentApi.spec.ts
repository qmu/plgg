import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import {
  type Result,
  type Dict,
  some,
  none,
  isErr,
  matchResult,
} from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
  type HttpError,
  handle,
} from "plggpress/framework";
import { heading, para } from "plgg-md";
import {
  type Db,
  openIndex,
  registerCollection,
  indexDocument,
  collectionSchema,
  schemaField,
} from "plgg-content";
import { contentApi } from "plggpress/api/contentApi";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

/** jsonResponse bodies are strings; project the union. */
const bodyText = (res: HttpResponse): string =>
  typeof res.body === "string" ? res.body : "";

/** The HttpError tag of a failed handle, or "Ok". */
const errTag = (
  r: Result<HttpResponse, HttpError>,
): string =>
  matchResult<HttpResponse, HttpError, string>(
    (e: HttpError) => e.__tag,
    () => "Ok",
  )(r);

const req = (
  path: string,
  query: Dict<string, string> = {},
  params: Dict<string, string> = {},
): HttpRequest => ({
  method: "GET",
  path,
  query,
  headers: {},
  params,
  body: "",
  bytes: none(),
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
    await indexDocument(db)({
      collection: "blog",
      path: "/blog/a",
      title: some("Alpha"),
      attributesJson: '{"draft":false}',
      blocks: [
        heading(1, "Alpha"),
        para("kangaroo body"),
      ],
      contentHash: "h-a",
      updatedAt: "2026-01-01T00:00:00Z",
    }),
  );
  return db;
};

test("GET /collections returns the registered schemas as JSON", async () => {
  const res = must(
    await handle(
      contentApi(await seed()),
      req("/collections"),
    ),
  );
  return all([
    check(res.status.content, toBe(200)),
    check(bodyText(res), toContain("blog")),
  ]);
});

test("GET /search finds a document by body text", async () => {
  const res = must(
    await handle(
      contentApi(await seed()),
      req("/search", { q: "kangaroo" }),
    ),
  );
  return all([
    check(res.status.content, toBe(200)),
    check(bodyText(res), toContain("/blog/a")),
  ]);
});

test("GET /document returns one document", async () => {
  const res = must(
    await handle(
      contentApi(await seed()),
      req("/document", {
        collection: "blog",
        path: "/blog/a",
      }),
    ),
  );
  return all([
    check(res.status.content, toBe(200)),
    check(bodyText(res), toContain("Alpha")),
  ]);
});

test("GET /document 400s without the required params", async () => {
  const r = await handle(
    contentApi(await seed()),
    req("/document"),
  );
  return check(errTag(r), toBe("BadRequest"));
});

test("GET /document 404s for an unknown path", async () => {
  const r = await handle(
    contentApi(await seed()),
    req("/document", {
      collection: "blog",
      path: "/blog/nope",
    }),
  );
  return check(errTag(r), toBe("NotFound"));
});

test("GET /collections/:name lists the collection (param routed)", async () => {
  const res = must(
    await handle(
      contentApi(await seed()),
      req("/collections/blog"),
    ),
  );
  return all([
    check(res.status.content, toBe(200)),
    check(bodyText(res), toContain("totalCount")),
  ]);
});
