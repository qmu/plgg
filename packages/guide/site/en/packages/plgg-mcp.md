# plgg-mcp — Expose tools through MCP

Collect tool names, descriptions, input schemas, and handlers in a `ToolRegistry`. `dispatchMcp` handles `initialize`, `tools/list`, and `tools/call`, so clients can discover a tool and call it by name. Use `runStdioServer` for a standard I/O server. For tools that work on managed content, see [plgg-cms](/packages/plgg-cms/).
