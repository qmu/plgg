# plgg-cms

The dynamic CMS package that pairs with
[plggpress](/packages/plggpress). plggpress owns the static
site generator and framework seam; plgg-cms owns the
always-on Prag CMS product surface: content indexing and
query, content delivery, admin UI, authentication, editing,
media, stakeholder submission, MCP, plugin export, ops, and
agent surfaces.

## Runtime surface

The `plgg-cms` bin runs a persistent `node:http` process.
It composes onto `plggpress/framework` and mounts the CMS
subtrees around the same site configuration used by the
static build.

Current package dependencies include:

- [plgg-ui](/packages/plgg-ui) for the retained shared UI
  engine used by the admin declaration and rendering
  surfaces.
- [plgg-sql](/packages/plgg-sql) and
  [plgg-db-migration](/packages/plgg-db-migration) for the
  CMS-owned content index and stores.
- [plgg-auth](/packages/plgg-auth) for OIDC/account flows.

The former content and MCP packages are no longer
independent package boundaries. Their source now lives
inside `plgg-cms` under `src/content/` and
`src/mcpProtocol/`.

## Content and MCP ownership

`src/content/` contains the rebuildable SQLite content
index, collection/query functions, editing stores, media
stores, stakeholder stores, and RAG search helpers. The
same typed `Db`-taking functions back the `/api` delivery
mount, admin browsing/editing, plugin export, MCP tools,
and agent-facing search.

`src/mcpProtocol/` contains the JSON-RPC/MCP protocol core,
tool registry, content tools, and transports. The HTTP MCP
mount and any stdio transport use the same dispatch and tool
definitions.

## Boundary decision

`plgg-cms` is the package boundary for Prag CMS. `plggpress`
does not depend on it, and `plgg-cms` depends on
`plggpress` one-way through the `plggpress/framework` seam.

`plgg-ui` remains a separate shared engine because it is
still consumed by plggpress and the standalone plggmatic
repository. CMS-specific UI composition belongs in
`plgg-cms`; shared typed UI primitives, declaration
vocabulary, rendering, scheduler, forms, and theme tokens
remain in `plgg-ui` until those consumers stop requiring
the published package.
