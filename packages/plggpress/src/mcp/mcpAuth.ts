import {
  type Option,
  type SoftStr,
  type Dict,
  some,
  none,
  isSoftStr,
  getOr,
  fromNullable,
  matchResult,
  asRawObj,
} from "plgg";
import {
  type RpcError,
  rpcError,
  parseRequest,
} from "plgg-mcp";

/** JSON-RPC error code for an unauthorized write (mirrors HTTP 403 intent). */
export const UNAUTHORIZED = -32001;

/**
 * Pull the bearer token out of an `Authorization: Bearer <t>`
 * header (case-insensitive scheme), or `None`. Pure — an absent
 * or malformed header simply yields `None`, and a public read
 * request carries no bearer at all.
 */
export const extractBearer = (
  headers: Dict<string, SoftStr>,
): Option<SoftStr> => {
  const raw = getOr("")(
    fromNullable(headers["authorization"]),
  );
  const m = /^bearer\s+(.+)$/i.exec(raw);
  return m === null
    ? none()
    : isSoftStr(m[1])
      ? some(m[1])
      : none();
};

/**
 * Is a frame a `tools/call` to one of the WRITE-scoped tools?
 * Pure — used to decide whether a request needs an
 * account-holder token (D6/D15): read tools (`search_content`
 * etc.) are public; only writes demand a scope. A non-call or a
 * read-tool call returns `false` (no auth needed).
 */
export const isWriteCall = (
  frame: SoftStr,
  writeTools: ReadonlyArray<SoftStr>,
): boolean =>
  matchResult<
    { method: SoftStr; params: unknown },
    unknown,
    boolean
  >(
    () => false,
    (req) =>
      req.method === "tools/call" &&
      matchResult<
        Record<string, unknown>,
        unknown,
        boolean
      >(
        () => false,
        (obj) => {
          const name = obj["name"];
          return (
            isSoftStr(name) &&
            writeTools.some((w) => w === name)
          );
        },
      )(asRawObj<Record<string, unknown>>(req.params)),
  )(parseRequest(frame));

/**
 * The resource-server decision (ticket 27, OAuth 2.1): a write
 * call with no write access is refused; everything else — a read
 * call, a non-call method, an authorized write — is allowed.
 * `Some(RpcError)` means "reject with this JSON-RPC error";
 * `None` means "proceed". Pure and total.
 */
export const guardWrite = (
  frame: SoftStr,
  writeTools: ReadonlyArray<SoftStr>,
  hasWriteScope: boolean,
): Option<RpcError> =>
  isWriteCall(frame, writeTools) &&
  !hasWriteScope
    ? some(
        rpcError(
          UNAUTHORIZED,
          "this tool requires an authenticated account-holder token",
        ),
      )
    : none();
