# plgg-cms

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

The **dynamic content-management surface** that pairs with
the [plggpress](../plggpress/) static-site generator. Where
plggpress renders the public reader path (SSG/CDN), plgg-cms
is the always-on half: content indexing and query services,
an admin UI, a read-only content delivery API, OIDC auth,
content editing, media, stakeholder submission, ops, MCP
protocol/tools, and the agent surfaces —
composed onto plggpress's generic web-application seam
(`plggpress/framework`) and served as a persistent
`node:http` instance via the `plgg-cms` bin.

## Why this package exists

plggpress split its two concerns into two packages so the
static-site generator can be consumed (and published) on its
own. plgg-cms holds the dynamic surface and now owns the
former content and MCP package source internally under
`src/content/` and `src/mcpProtocol/`. The dependency
direction is one-way: plgg-cms depends on plggpress;
plggpress never depends on plgg-cms.

## Surface

- `plgg-cms` bin — the `serve` command: loads `site.config.ts`
  once and mounts the composed served app (`/`, `/api`,
  `/admin`, `/auth`, `/mcp`) on a persistent `node:http`
  instance.
- `contentApi` — the read-only delivery API (a thin
  `plgg-server` Web sub-app over `src/content/`'s in-process
  query functions).
- `src/content/` — the rebuildable SQLite content index,
  collection/query functions, editing/media/stakeholder
  stores, and RAG search helpers.
- `src/mcpProtocol/` — the JSON-RPC/MCP protocol core, tool
  registry, content tools, and transports.
- `pressServeWeb` / `pressServeWebWithAuth` — the served-app
  factory the `serve` bin and consumers compose.

## Development

Standard plgg monorepo runners: `scripts/tsc-plgg.sh`,
`scripts/test-plgg.sh`, and `scripts/check-all.sh` cover this
package alongside the rest.
