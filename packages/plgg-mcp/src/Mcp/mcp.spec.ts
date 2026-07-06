import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Option,
  ok,
  err,
  some,
  defect,
} from "plgg";
import {
  type RpcRequest,
  type RpcResponse,
  type RpcId,
} from "plgg-mcp/Rpc/model/RpcMessage";
import {
  type Tool,
  type ServerInfo,
  textResult,
  errorResult,
} from "plgg-mcp/Mcp/model/Tool";
import { dispatchMcp } from "plgg-mcp/Mcp/usecase/dispatchMcp";

const echoTool: Tool = {
  name: "echo",
  description: "echoes its args",
  inputSchema: { type: "object" },
  call: async (args) =>
    ok(textResult(JSON.stringify(args))),
};
const failTool: Tool = {
  name: "boom",
  description: "always defects",
  inputSchema: {},
  call: async () => err(defect("kaboom")),
};
const domainErrTool: Tool = {
  name: "nope",
  description: "reports a domain error",
  inputSchema: {},
  call: async () =>
    ok(errorResult("not allowed")),
};

const server: ServerInfo = {
  name: "plgg-mcp",
  version: "0.0.1",
};
const dispatch = dispatchMcp(
  [echoTool, failTool, domainErrTool],
  server,
);

const req = (
  method: string,
  params: unknown,
  id: Option<RpcId> = some(1),
): RpcRequest => ({ id, method, params });

const tag = (r: RpcResponse): string => r.__tag;
const value = (r: RpcResponse): unknown =>
  r.__tag === "RpcOk"
    ? r.content.value
    : r.content.error;

test("initialize returns the protocol version + server info", async () => {
  const r = await dispatch(
    req("initialize", {}),
  );
  const v = value(r);
  const info =
    typeof v === "object" && v !== null
      ? (v as Record<string, unknown>)
      : {};
  return all([
    check(tag(r), toBe("RpcOk")),
    check(
      info["protocolVersion"],
      toBe("2024-11-05"),
    ),
  ]);
});

test("tools/list lists every registered tool", async () => {
  const r = await dispatch(
    req("tools/list", {}),
  );
  const v = value(r);
  const tools =
    typeof v === "object" &&
    v !== null &&
    Array.isArray(
      (v as { tools?: unknown }).tools,
    )
      ? (v as { tools: unknown[] }).tools
      : [];
  return all([
    check(tag(r), toBe("RpcOk")),
    check(tools.length, toBe(3)),
  ]);
});

test("tools/call runs a tool and returns its result", async () => {
  const r = await dispatch(
    req("tools/call", {
      name: "echo",
      arguments: { x: 1 },
    }),
  );
  return check(tag(r), toBe("RpcOk"));
});

test("a domain-error tool result still rides a success response (isError)", async () => {
  const r = await dispatch(
    req("tools/call", {
      name: "nope",
      arguments: {},
    }),
  );
  const v = value(r);
  const isErr =
    typeof v === "object" &&
    v !== null &&
    (v as { isError?: boolean }).isError ===
      true;
  return all([
    check(tag(r), toBe("RpcOk")),
    check(isErr, toBe(true)),
  ]);
});

test("a defecting tool, an unknown tool, bad params, and an unknown method are JSON-RPC errors", async () => {
  const boom = await dispatch(
    req("tools/call", {
      name: "boom",
      arguments: {},
    }),
  );
  const missing = await dispatch(
    req("tools/call", {
      name: "ghost",
      arguments: {},
    }),
  );
  const badParams = await dispatch(
    req("tools/call", { arguments: {} }),
  );
  const badMethod = await dispatch(
    req("resources/list", {}),
  );
  return all([
    check(tag(boom), toBe("RpcErr")),
    check(tag(missing), toBe("RpcErr")),
    check(tag(badParams), toBe("RpcErr")),
    check(tag(badMethod), toBe("RpcErr")),
  ]);
});
