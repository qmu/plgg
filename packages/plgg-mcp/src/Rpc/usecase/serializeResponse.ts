import {
  type Option,
  type SoftStr,
  some,
  none,
  getOr,
  matchOption,
  isSome,
} from "plgg";
import {
  type RpcResponse,
  type RpcId,
} from "plgg-mcp/Rpc/model/RpcMessage";

/**
 * Serialize a {@link RpcResponse} to a wire frame, or `None`
 * when nothing should be sent. JSON-RPC rules:
 *
 * - a SUCCESS to a notification (no id) → `None` (drop it);
 * - a success to a request → `{jsonrpc, id, result}`;
 * - an ERROR is ALWAYS sent, with the request id or `null` when
 *   the id couldn't be recovered (e.g. a parse error).
 *
 * Pure — the transport decides what to do with the `None`.
 */
export const serializeResponse = (
  res: RpcResponse,
): Option<SoftStr> =>
  res.__tag === "RpcOk"
    ? matchOption<RpcId, Option<SoftStr>>(
        () => none(),
        (id: RpcId) =>
          some(
            JSON.stringify({
              jsonrpc: "2.0",
              id,
              result: res.content.value,
            }),
          ),
      )(res.content.id)
    : some(
        JSON.stringify({
          jsonrpc: "2.0",
          id: getOr<RpcId | null>(null)(
            res.content.id,
          ),
          error: isSome(res.content.error.data)
            ? {
                code: res.content.error.code,
                message:
                  res.content.error.message,
                data: res.content.error.data
                  .content,
              }
            : {
                code: res.content.error.code,
                message:
                  res.content.error.message,
              },
        }),
      );
