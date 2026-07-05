import {
  type SoftStr,
  type PromisedResult,
  ok,
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
  dispatchMcp,
  handleFrame,
} from "plgg-mcp";

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
): Web => {
  const handle = handleFrame(
    dispatchMcp(tools, serverInfo),
  );
  return post(
    "/mcp",
    (
      c: Context,
    ): PromisedResult<
      HttpResponse,
      HttpError
    > =>
      handle(c.req.body).then(
        matchOption<SoftStr, HttpResponse>(
          () =>
            textResponse(
              "",
              statusOf(202),
              {},
            ),
          (frame: SoftStr) =>
            textResponse(frame, statusOf(200), {
              "content-type":
                "application/json",
            }),
        ),
      ).then(ok),
  )(web());
};
