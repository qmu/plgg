import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isSome, isNone, ok } from "plgg";
import {
  type Tool,
  type ServerInfo,
  textResult,
} from "plgg-mcp/Mcp/model/Tool";
import { dispatchMcp } from "plgg-mcp/Mcp/usecase/dispatchMcp";
import { handleFrame } from "plgg-mcp/Transport/handleFrame";

const pingTool: Tool = {
  name: "ping",
  description: "pong",
  inputSchema: { type: "object" },
  call: async () => ok(textResult("pong")),
};
const server: ServerInfo = {
  name: "plgg-mcp",
  version: "0.0.1",
};
const handle = handleFrame(
  dispatchMcp([pingTool], server),
);

test("handleFrame answers a request with a result frame", async () => {
  const r = await handle(
    '{"jsonrpc":"2.0","id":1,"method":"tools/list"}',
  );
  return all([
    check(isSome(r), toBe(true)),
    check(
      isSome(r)
        ? r.content.includes('"result"')
        : false,
      toBe(true),
    ),
  ]);
});

test("a malformed frame answers with a null-id error frame", async () => {
  const r = await handle("this is not json");
  return all([
    check(isSome(r), toBe(true)),
    check(
      isSome(r)
        ? r.content.includes('"id":null') &&
            r.content.includes('"error"')
        : false,
      toBe(true),
    ),
  ]);
});

test("a notification (no id) is handled and writes nothing", async () => {
  const r = await handle(
    '{"jsonrpc":"2.0","method":"initialize"}',
  );
  return check(isNone(r), toBe(true));
});
