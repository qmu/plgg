import {
  type Box,
  type Option,
  type Num,
  type SoftStr,
  box,
  none,
} from "plgg";

/**
 * A JSON-RPC 2.0 message id — a number or a string (never
 * fractional, per spec, but we don't enforce that). Held as an
 * `Option` on a request: `None` is a NOTIFICATION (no reply).
 */
export type RpcId = Num | SoftStr;

/**
 * A parsed JSON-RPC 2.0 request. `id` `None` = notification;
 * `params` stays `unknown` until a method handler decodes it
 * against its own schema (fail-closed at the edge, not here).
 */
export type RpcRequest = Readonly<{
  id: Option<RpcId>;
  method: SoftStr;
  params: unknown;
}>;

/** A JSON-RPC 2.0 error object. */
export type RpcError = Readonly<{
  code: Num;
  message: SoftStr;
  data: Option<unknown>;
}>;

/**
 * A response to dispatch: `RpcOk` carries a result, `RpcErr` an
 * error — both echo the request `id` (a notification's `None`
 * id means the transport drops the frame). A closed union so
 * the serializer folds it exhaustively.
 */
export type RpcResponse =
  | Box<
      "RpcOk",
      { id: Option<RpcId>; value: unknown }
    >
  | Box<
      "RpcErr",
      { id: Option<RpcId>; error: RpcError }
    >;

/** The standard JSON-RPC 2.0 error codes (plus MCP's usage). */
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

/** Assemble an {@link RpcError} (no `data` by default). */
export const rpcError = (
  code: Num,
  message: SoftStr,
  data: Option<unknown> = none(),
): RpcError => ({ code, message, data });

/** A success {@link RpcResponse}. */
export const rpcOk = (
  id: Option<RpcId>,
  value: unknown,
): RpcResponse => box("RpcOk")({ id, value });

/** An error {@link RpcResponse}. */
export const rpcErr = (
  id: Option<RpcId>,
  error: RpcError,
): RpcResponse => box("RpcErr")({ id, error });
