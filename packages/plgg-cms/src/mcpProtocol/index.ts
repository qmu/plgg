// The MCP protocol substrate lives in its own package
// again (ticket 20260716000445 reversed the 87b46fc9
// consolidation): plgg-mcp carries Rpc, Mcp,
// Transport, and the stdio vendor seam with no
// content coupling — node:sqlite is pinned absent
// from its module graph. plgg-cms keeps the content
// TOOLS (the store-coupled default tool set) and
// re-exports both, so this barrel's surface is
// unchanged for every existing consumer.
export * from "plgg-mcp";
export * from "plgg-cms/mcpProtocol/Tools";
