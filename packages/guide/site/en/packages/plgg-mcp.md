# plgg-mcp — Expose tools through MCP

Collect tool names, descriptions, input schemas, and handlers in a `ToolRegistry`. `dispatchMcp` handles `initialize`, `tools/list`, and `tools/call`, so clients can discover a tool and call it by name. Use `runStdioServer` for a standard I/O server. For tools that work on managed content, see [plgg-cms](/packages/plgg-cms/).

## Working with the API

`dispatchMcp(tools, serverInfo)(request) → Promise<RpcResponse>`

tools/list advertises inputSchema to clients. Arguments arriving at tools/call are still unknown and the tool’s call function must decode them. Return errorResult for a tool-level failure and textResult for ordinary text.

```ts
import { some } from "plgg";
import { dispatchMcp } from "plgg-mcp";

const dispatch = dispatchMcp([], {
  name: "library",
  version: "1",
});
console.log(
  await dispatch({
    id: some(1),
    method: "tools/list",
    params: {},
  }),
);
```

## Read failures at the correct level

Unknown methods and tool names yield JSON-RPC errors. A tool that was found but cannot fulfill a domain request can return errorResult(message), setting ToolResult.isError. That result travels in a successful RPC response. Inspect the tool result as well as the outer tag.
