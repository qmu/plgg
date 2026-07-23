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

- [plgg-sql](/packages/plgg-sql) and
  [plgg-db-migration](/packages/plgg-db-migration) for the
  CMS-owned content index, stores, durable-domain
  derivation, and schema compatibility checks.
- [plgg-auth](/packages/plgg-auth) for OIDC/account flows.

The former UI, content, MCP, and durable-domain package
boundaries are no longer independent package leaves. Their
source now lives inside `plgg-cms` under `src/ui/`,
`src/content/`, `src/mcpProtocol/`, and `src/domainCore/`.

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

`src/ui/` contains the declaration vocabulary, scheduler,
form controls, screen renderers, and admin UI components
used by the `/admin` surface.

`src/domainCore/` contains the durable-core derivation spine:
authored caster-typed entities, SQLite schema derivation,
schema compatibility checks, export/import, and the seams a
regenerated shell is rebuilt from.

## Boundary decision

`plgg-cms` is the package boundary for Prag CMS. `plggpress`
does not depend on it, and `plgg-cms` depends on
`plggpress` one-way through the `plggpress/framework` seam.

The admin UI and durable-domain internals are CMS-owned
source, not public package boundaries. plggpress carries its
static theme support locally so it remains a slim SSG without
depending on CMS.
