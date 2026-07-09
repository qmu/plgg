import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { type Result, isErr, none } from "plgg";
import {
  type HttpRequest,
  type Method,
  handle,
} from "plgg-server";
import {
  openIndex,
  registerCollection,
  collectionSchema,
  openDb,
} from "plgg-content";
import {
  type PluginConfig,
  pluginWeb,
} from "plgg-cms/plugin/pluginWeb";

const must = <T>(
  r: Result<T, unknown>,
): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const config: PluginConfig = {
  owner: "acme",
  pluginName: "acme-docs",
  version: "1.0.0",
  description: "Acme knowledge base",
  source: "./acme-docs",
  mcpUrl: "https://docs.example/mcp",
};

const seed = async () => {
  const db = must(
    await openIndex(":memory:"),
  );
  must(
    await registerCollection(db)(
      collectionSchema("blog", []),
    ),
  );
  return db;
};

const req = (path: string): HttpRequest => ({
  method: "GET" as Method,
  path,
  query: {},
  headers: {},
  params: {},
  body: "",
  bytes: none(),
});

const body = (res: {
  body: unknown;
}): string => String(res.body);

test("serves the marketplace manifest, plugin manifest, and .mcp.json", async () => {
  const db = await seed();
  const app = pluginWeb(db, config);
  const market = must(
    await handle(
      app,
      req("/.claude-plugin/marketplace.json"),
    ),
  );
  const plugin = must(
    await handle(
      app,
      req("/.claude-plugin/plugin.json"),
    ),
  );
  const mcp = must(
    await handle(app, req("/.mcp.json")),
  );
  return all([
    check(market.status.content, toBe(200)),
    check(
      body(market).includes("acme-docs"),
      toBe(true),
    ),
    check(
      body(plugin).includes("1.0.0"),
      toBe(true),
    ),
    check(
      body(mcp).includes(
        "https://docs.example/mcp",
      ),
      toBe(true),
    ),
  ]);
});

test("serves skills generated live from the collections", async () => {
  const db = await seed();
  const res = must(
    await handle(
      pluginWeb(db, config),
      req("/.claude-plugin/skills.json"),
    ),
  );
  return all([
    check(res.status.content, toBe(200)),
    check(
      body(res).includes("search-blog"),
      toBe(true),
    ),
  ]);
});

test("a store error on the skills endpoint is a 500", async () => {
  const broken = openDb(":memory:");
  const res = await handle(
    pluginWeb(broken, config),
    req("/.claude-plugin/skills.json"),
  );
  return check(isErr(res), toBe(true));
});
