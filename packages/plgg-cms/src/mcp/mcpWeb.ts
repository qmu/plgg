import {
  type SoftStr,
  type PromisedResult,
  ok,
  none,
  getOr,
  matchOption,
} from "plgg";
import {
  type Web,
  type Context,
  type HttpResponse,
  type HttpError,
  web,
  post,
  textResponse,
  statusOf,
} from "plggpress/framework";
import {
  type ToolRegistry,
  type ServerInfo,
  type RpcError,
  dispatchMcp,
  handleFrame,
  serializeResponse,
  rpcErr,
} from "plgg-cms/mcpProtocol";
import { guardWrite } from "plgg-cms/mcp/mcpAuth";

const jsonBody = (frame: SoftStr): HttpResponse =>
  textResponse(frame, statusOf(200), {
    "content-type": "application/json",
  });

const runFrame =
  (
    tools: ToolRegistry,
    serverInfo: ServerInfo,
  ) =>
  (
    body: SoftStr,
  ): PromisedResult<HttpResponse, HttpError> =>
    handleFrame(dispatchMcp(tools, serverInfo))(
      body,
    )
      .then(
        matchOption<SoftStr, HttpResponse>(
          () =>
            textResponse(
              "",
              statusOf(202),
              {},
            ),
          jsonBody,
        ),
      )
      .then(ok);

/**
 * The MCP Streamable-HTTP transport (ticket 27, D15 second
 * half): `POST /mcp` carries ONE JSON-RPC frame in the body and
 * is answered by the SAME pure {@link handleFrame} pipeline the
 * stdio transport uses — this route is only a thin Web adapter.
 * A frame that yields a response returns it as
 * `application/json` (200); a NOTIFICATION (no reply) returns
 * 202 with an empty body. Never throws — a malformed frame is a
 * JSON-RPC error frame, still a 200. The OAuth resource-server
 * guard wraps this route separately.
 */
export const mcpWeb = (
  tools: ToolRegistry,
  serverInfo: ServerInfo,
): Web =>
  post(
    "/mcp",
    (c: Context) =>
      runFrame(tools, serverInfo)(c.req.body),
  )(web());

/**
 * The OAuth 2.1 resource-server variant (ticket 27): identical
 * to {@link mcpWeb} for reads, but a `tools/call` to a
 * WRITE-scoped tool without account-holder write access is
 * refused with a `401` JSON-RPC error (WWW-Authenticate set) —
 * public read stays open, writes demand a token. `resolveWrite`
 * is the injected bearer→scope check (extract + validate against
 * our OP); a test passes a fake. Never throws.
 */
export const mcpWebGuarded = (
  tools: ToolRegistry,
  serverInfo: ServerInfo,
  writeTools: ReadonlyArray<SoftStr>,
  resolveWrite: (
    c: Context,
  ) => Promise<boolean>,
): Web =>
  post(
    "/mcp",
    (
      c: Context,
    ): PromisedResult<
      HttpResponse,
      HttpError
    > =>
      resolveWrite(c).then(
        (hasWrite: boolean) =>
          matchOption<
            RpcError,
            PromisedResult<
              HttpResponse,
              HttpError
            >
          >(
            () =>
              runFrame(tools, serverInfo)(
                c.req.body,
              ),
            (e: RpcError) =>
              Promise.resolve(
                ok(
                  textResponse(
                    getOr("")(
                      serializeResponse(
                        rpcErr(none(), e),
                      ),
                    ),
                    statusOf(401),
                    {
                      "content-type":
                        "application/json",
                      "www-authenticate":
                        'Bearer realm="plggpress-mcp"',
                    },
                  ),
                ),
              ),
          )(
            guardWrite(
              c.req.body,
              writeTools,
              hasWrite,
            ),
          ),
      ),
  )(web());
