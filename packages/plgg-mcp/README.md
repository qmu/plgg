# plgg-mcp

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

A **hand-rolled** JSON-RPC 2.0 / Model Context Protocol server, written from
scratch on `plgg` primitives and the Node standard library — **no
`@modelcontextprotocol/sdk`, no third-party JSON-RPC library** (D15,
vendor-neutrality). MCP is a wire format, and a wire format is expressible as
typed, `Result`-returning functions.

This package is the **stdio-transport + read-only-tools first** half (ticket 26);
the streamable HTTP + OAuth transport is ticket 27.

## Layers

- `Rpc` — JSON-RPC 2.0 messages (request/response/error) parsed and serialized
  **fail-closed**: a malformed frame is a typed error object, never a throw.
- `Mcp` — the MCP method handlers (`initialize`, `tools/list`, `tools/call`) over
  a registry of typed tools.
- `Tools` — read-only plggpress content tools (`search_content`, `get_article`,
  `list_collections`) wrapping plgg-content's in-process query functions.
- `Transport` — the `process.stdin`/`stdout` line-delimited loop (the only IO
  seam).
