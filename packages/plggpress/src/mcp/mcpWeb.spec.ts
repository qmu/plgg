import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  isErr,
  none,
} from "plgg";
import {
  type HttpRequest,
  type Method,
  handle,
} from "plgg-server";
import { type ServerInfo } from "plgg-mcp";
import {
  mcpWeb,
  mcpWebGuarded,
} from "plggpress/mcp/mcpWeb";

const must = <T>(
  r: Result<T, unknown>,
): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const server: ServerInfo = {
  name: "plggpress-mcp",
  version: "0.0.1",
};
const app = mcpWeb([], server);

const mcpReq = (body: string): HttpRequest => ({
  method: "POST" as Method,
  path: "/mcp",
  query: {},
  headers: {},
  params: {},
  body,
  bytes: none(),
});

test("POST /mcp answers a JSON-RPC request as application/json", async () => {
  const res = must(
    await handle(
      app,
      mcpReq(
        '{"jsonrpc":"2.0","id":1,"method":"tools/list"}',
      ),
    ),
  );
  return all([
    check(res.status.content, toBe(200)),
    check(
      String(res.body).includes('"result"'),
      toBe(true),
    ),
    check(
      res.headers["content-type"] ?? "",
      toBe("application/json"),
    ),
  ]);
});

test("a malformed frame is still a 200 JSON-RPC error frame", async () => {
  const res = must(
    await handle(app, mcpReq("garbage")),
  );
  return all([
    check(res.status.content, toBe(200)),
    check(
      String(res.body).includes('"error"'),
      toBe(true),
    ),
  ]);
});

test("a notification returns 202 with an empty body", async () => {
  const res = must(
    await handle(
      app,
      mcpReq(
        '{"jsonrpc":"2.0","method":"initialize"}',
      ),
    ),
  );
  return all([
    check(res.status.content, toBe(202)),
    check(String(res.body), toBe("")),
  ]);
});

test("mcpWebGuarded refuses a write call without access (401) and allows it with access", async () => {
  const writeCall =
    '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"delete_article"}}';
  const denied = must(
    await handle(
      mcpWebGuarded(
        [],
        server,
        ["delete_article"],
        async () => false,
      ),
      mcpReq(writeCall),
    ),
  );
  const allowed = must(
    await handle(
      mcpWebGuarded(
        [],
        server,
        ["delete_article"],
        async () => true,
      ),
      mcpReq(writeCall),
    ),
  );
  const readOpen = must(
    await handle(
      mcpWebGuarded(
        [],
        server,
        ["delete_article"],
        async () => false,
      ),
      mcpReq(
        '{"jsonrpc":"2.0","id":2,"method":"tools/list"}',
      ),
    ),
  );
  return all([
    check(denied.status.content, toBe(401)),
    // allowed → dispatched (the tool doesn't exist → JSON-RPC error, but 200)
    check(allowed.status.content, toBe(200)),
    check(readOpen.status.content, toBe(200)),
  ]);
});
