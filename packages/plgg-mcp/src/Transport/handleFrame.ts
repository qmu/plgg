import {
  type Option,
  type SoftStr,
  none,
  matchResult,
} from "plgg";
import {
  type RpcRequest,
  type RpcResponse,
  type RpcError,
  rpcErr,
} from "plgg-mcp/Rpc/model/RpcMessage";
import { parseRequest } from "plgg-mcp/Rpc/usecase/parseRequest";
import { serializeResponse } from "plgg-mcp/Rpc/usecase/serializeResponse";

/**
 * Handle ONE transport frame end to end, PURE (parse → dispatch
 * → serialize), so the whole protocol path is testable without
 * any IO. A parse failure becomes a JSON-RPC error frame with a
 * `null` id; a request is dispatched and its response
 * serialized; a NOTIFICATION success serializes to `None` — the
 * transport then writes nothing. `dispatch` is the injected
 * method router (e.g. `dispatchMcp(registry, serverInfo)`).
 */
export const handleFrame =
  (
    dispatch: (
      req: RpcRequest,
    ) => Promise<RpcResponse>,
  ) =>
  (line: SoftStr): Promise<Option<SoftStr>> =>
    matchResult<
      RpcRequest,
      RpcError,
      Promise<Option<SoftStr>>
    >(
      (e: RpcError) =>
        Promise.resolve(
          serializeResponse(rpcErr(none(), e)),
        ),
      (req: RpcRequest) =>
        dispatch(req).then(serializeResponse),
    )(parseRequest(line));
