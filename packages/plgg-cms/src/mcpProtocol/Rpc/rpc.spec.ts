import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  isErr,
  isSome,
  isNone,
  none,
  some,
} from "plgg";
import {
  type RpcError,
  rpcOk,
  rpcErr,
  rpcError,
  PARSE_ERROR,
  INVALID_REQUEST,
} from "plgg-cms/mcpProtocol/Rpc/model/RpcMessage";
import { parseRequest } from "plgg-cms/mcpProtocol/Rpc/usecase/parseRequest";
import { serializeResponse } from "plgg-cms/mcpProtocol/Rpc/usecase/serializeResponse";

const must = <T>(
  r: Result<T, unknown>,
): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

test("parseRequest reads a well-formed request", () => {
  const r = must(
    parseRequest(
      '{"jsonrpc":"2.0","id":7,"method":"tools/list","params":{"x":1}}',
    ),
  );
  return all([
    check(r.method, toBe("tools/list")),
    check(isSome(r.id), toBe(true)),
  ]);
});

test("a request without an id is a notification", () => {
  const r = must(
    parseRequest(
      '{"jsonrpc":"2.0","method":"ping"}',
    ),
  );
  return check(isNone(r.id), toBe(true));
});

test("parseRequest fails closed on bad frames", () => {
  const errorCode = (
    r: Result<unknown, RpcError>,
  ): number =>
    isErr(r) ? r.content.code : 0;
  return all([
    check(
      errorCode(parseRequest("not json")),
      toBe(PARSE_ERROR),
    ),
    check(
      errorCode(parseRequest("[1,2,3]")),
      toBe(INVALID_REQUEST),
    ),
    check(
      errorCode(
        parseRequest('{"jsonrpc":"1.0","method":"x"}'),
      ),
      toBe(INVALID_REQUEST),
    ),
    check(
      errorCode(
        parseRequest('{"jsonrpc":"2.0","method":5}'),
      ),
      toBe(INVALID_REQUEST),
    ),
  ]);
});

test("serializeResponse emits a result for a request, drops a notification success", () => {
  const withId = serializeResponse(
    rpcOk(some(7), { ok: true }),
  );
  const notif = serializeResponse(
    rpcOk(none(), { ok: true }),
  );
  return all([
    check(isSome(withId), toBe(true)),
    check(
      isSome(withId)
        ? withId.content.includes('"result"')
        : false,
      toBe(true),
    ),
    check(isNone(notif), toBe(true)),
  ]);
});

test("serializeResponse always sends an error, with null id when unknown, and includes data", () => {
  const known = serializeResponse(
    rpcErr(some(3), rpcError(-32601, "no method")),
  );
  const unknown = serializeResponse(
    rpcErr(none(), rpcError(PARSE_ERROR, "parse")),
  );
  const withData = serializeResponse(
    rpcErr(
      some(1),
      rpcError(-32602, "bad", some({ hint: "x" })),
    ),
  );
  return all([
    check(
      isSome(known) &&
        known.content.includes('"error"'),
      toBe(true),
    ),
    check(
      isSome(unknown) &&
        unknown.content.includes('"id":null'),
      toBe(true),
    ),
    check(
      isSome(withData) &&
        withData.content.includes('"data"'),
      toBe(true),
    ),
  ]);
});
