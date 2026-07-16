import {
  type Defect,
  isSoftStr,
  matchResult,
  asRawObj,
} from "plgg";
import {
  type RpcRequest,
  type RpcResponse,
  rpcOk,
  rpcErr,
  rpcError,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
  INTERNAL_ERROR,
} from "plgg-mcp/Rpc/model/RpcMessage";
import {
  type Tool,
  type ToolRegistry,
  type ServerInfo,
} from "plgg-mcp/Mcp/model/Tool";

/** The MCP protocol revision this server speaks. */
export const PROTOCOL_VERSION = "2024-11-05";

const toSchema = (t: Tool) => ({
  name: t.name,
  description: t.description,
  inputSchema: t.inputSchema,
});

/** Route `tools/call`: decode `{name, arguments}`, find the tool, run it. */
const callTool = (
  tools: ToolRegistry,
  req: RpcRequest,
): Promise<RpcResponse> =>
  matchResult<
    Record<string, unknown>,
    { content: { message: string } },
    Promise<RpcResponse>
  >(
    () =>
      Promise.resolve(
        rpcErr(
          req.id,
          rpcError(
            INVALID_PARAMS,
            "tools/call params must be an object",
          ),
        ),
      ),
    (obj: Record<string, unknown>) => {
      const name = obj["name"];
      if (!isSoftStr(name)) {
        return Promise.resolve(
          rpcErr(
            req.id,
            rpcError(
              INVALID_PARAMS,
              "tools/call requires a string name",
            ),
          ),
        );
      }
      const tool = tools.find(
        (t) => t.name === name,
      );
      return tool === undefined
        ? Promise.resolve(
            rpcErr(
              req.id,
              rpcError(
                METHOD_NOT_FOUND,
                `no such tool: ${name}`,
              ),
            ),
          )
        : tool.call(obj["arguments"]).then(
            matchResult<
              import("plgg-mcp/Mcp/model/Tool").ToolResult,
              Defect,
              RpcResponse
            >(
              (e: Defect) =>
                rpcErr(
                  req.id,
                  rpcError(
                    INTERNAL_ERROR,
                    e.content.message,
                  ),
                ),
              (result) => rpcOk(req.id, result),
            ),
          );
    },
  )(asRawObj(req.params));

/**
 * The MCP method dispatcher over a {@link ToolRegistry}. Every
 * method folds to an {@link RpcResponse} — protocol errors live
 * IN the response (JSON-RPC error object), never the promise's
 * rejection, so the transport just serializes whatever comes
 * back:
 *
 * - `initialize` → protocol version + `tools` capability +
 *   {@link ServerInfo};
 * - `tools/list` → each tool's name/description/inputSchema;
 * - `tools/call` → decode + find + run the tool (a tool's own
 *   `isError` result still rides a success response, per MCP);
 * - anything else → `-32601` method-not-found.
 *
 * Never throws.
 */
export const dispatchMcp =
  (tools: ToolRegistry, serverInfo: ServerInfo) =>
  (req: RpcRequest): Promise<RpcResponse> =>
    req.method === "initialize"
      ? Promise.resolve(
          rpcOk(req.id, {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo,
          }),
        )
      : req.method === "tools/list"
        ? Promise.resolve(
            rpcOk(req.id, {
              tools: tools.map(toSchema),
            }),
          )
        : req.method === "tools/call"
          ? callTool(tools, req)
          : Promise.resolve(
              rpcErr(
                req.id,
                rpcError(
                  METHOD_NOT_FOUND,
                  `method not found: ${req.method}`,
                ),
              ),
            );
