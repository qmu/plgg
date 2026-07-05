import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  type Dict,
  isErr,
  none,
} from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
  type Method,
  handle,
} from "plgg-server";
import {
  type Db,
  openIndex,
  registerCollection,
  collectionSchema,
} from "plgg-content";
import {
  sqlAccountStore,
  ACCOUNT_SCHEMA,
} from "plgg-auth";
import { deliverAdmin } from "plggpress/Admin/deliverAdmin";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const seed = async (): Promise<Db> => {
  const db = must(await openIndex(":memory:"));
  await db.execScript(ACCOUNT_SCHEMA);
  must(
    await registerCollection(db)(
      collectionSchema("blog", []),
    ),
  );
  return db;
};

const req = (
  path: string,
  query: Dict<string, string> = {},
): HttpRequest => ({
  method: "GET" as Method,
  path,
  query,
  headers: {},
  params: {},
  body: "",
  bytes: none(),
});

test("deliverAdmin serves the admin menu as an HTML document", async () => {
  const db = await seed();
  const app = deliverAdmin(db, sqlAccountStore(db));
  const res: HttpResponse = must(
    await handle(app, req("/")),
  );
  const body = String(res.body);
  return all([
    check(res.status.content, toBe(200)),
    check(
      body.startsWith("<!doctype html"),
      toBe(true),
    ),
    check(body.includes("Content"), toBe(true)),
    check(body.includes("Members"), toBe(true)),
  ]);
});
