# plgg-mcp

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

**The MCP protocol substrate of the plgg family** — a typed tool
registry and dispatch, JSON-RPC 2.0 framing, transport-agnostic frame
handling, and a stdio server seam. It carries **no content store and no
default tool set**: consumers register their own tools, and
`node:sqlite` is provably absent from the module graph (a spec walks
the package source and fails on the first content-shaped import).

```
plgg ── plgg-mcp ── (your ToolRegistry) ── stdio / HTTP transports
```

Re-extracted from `plgg-cms`'s internal `mcpProtocol` module by ticket
`20260716000445`: a substrate that reaches a SQLite store is not a
substrate. The content-coupled default tools (`search_content`,
`get_article`, `list_collections`) stay in
[plgg-cms](../plgg-cms/), which composes them onto this package and
keeps its own public surface unchanged.

## Layout

- `src/Rpc/` — JSON-RPC 2.0 message model, request parsing, response
  serialization.
- `src/Mcp/` — the `Tool` / `ToolRegistry` / `ServerInfo` model and
  the MCP dispatch (`initialize`, `tools/list`, `tools/call`).
- `src/Transport/` — transport-agnostic frame handling: one raw frame
  in, one serialized response (or none) out.
- `src/vendors/` — the `node:readline` stdio server seam
  (`runStdioServer(tools, serverInfo)`).
- `src/moduleGraph.spec.ts` — the pin: no `node:sqlite` /
  `plgg-sql` / `plgg-cms` / `plgg-content` anywhere in the source,
  and the runtime dependency set is exactly `plgg`.

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root `CLAUDE.md`).
- The only runtime dependency is `plgg`; `node:*` imports live under
  `vendors/` per the vendor-boundary policy.
- After editing a `file:`-linked dependency's source, rebuild its
  `dist` or this package won't see new exports.
