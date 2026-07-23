import {
  type Result,
  type Option,
  type SoftStr,
  type InvalidError,
  ok,
  err,
  some,
  none,
  isNum,
  isSoftStr,
  matchResult,
  asRawObj,
} from "plgg";
import {
  type RpcRequest,
  type RpcError,
  type RpcId,
  rpcError,
  PARSE_ERROR,
  INVALID_REQUEST,
} from "plgg-mcp/Rpc/model/RpcMessage";

const PARSE_FAILED: unique symbol = Symbol();

const tryParse = (
  frame: SoftStr,
): unknown | typeof PARSE_FAILED => {
  try {
    return JSON.parse(frame);
  } catch {
    return PARSE_FAILED;
  }
};

/**
 * A request id is a number or a string; anything else (null,
 * absent, object) means NOTIFICATION → `None`, so a handler
 * never mistakes a no-reply frame for one needing an answer.
 */
const extractId = (
  raw: unknown,
): Option<RpcId> =>
  isNum(raw)
    ? some(raw)
    : isSoftStr(raw)
      ? some(raw)
      : none();

/**
 * Parse one JSON-RPC 2.0 frame FAIL-CLOSED: unparseable JSON is
 * a `-32700` error, a non-object / wrong-version / non-string-
 * method frame is `-32600`, and `params` is left `unknown` for
 * the method handler to decode against its own schema. Never
 * throws — a hostile frame yields a typed `RpcError`, not a
 * crash.
 */
export const parseRequest = (
  frame: SoftStr,
): Result<RpcRequest, RpcError> => {
  const parsed = tryParse(frame);
  return parsed === PARSE_FAILED
    ? err(rpcError(PARSE_ERROR, "parse error"))
    : matchResult<
        Record<string, unknown>,
        InvalidError,
        Result<RpcRequest, RpcError>
      >(
        () =>
          err(
            rpcError(
              INVALID_REQUEST,
              "request must be a JSON object",
            ),
          ),
        (obj: Record<string, unknown>) => {
          const method = obj["method"];
          return obj["jsonrpc"] !== "2.0"
            ? err(
                rpcError(
                  INVALID_REQUEST,
                  'jsonrpc must be "2.0"',
                ),
              )
            : !isSoftStr(method)
              ? err(
                  rpcError(
                    INVALID_REQUEST,
                    "method must be a string",
                  ),
                )
              : ok({
                  id: extractId(obj["id"]),
                  method,
                  params: obj["params"],
                });
        },
      )(asRawObj(parsed));
};
