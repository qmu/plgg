# plggpress

The **static-site generator that builds this guide** —
and a **served content platform** on the same code.
Built from scratch on the plgg family, plggpress owns a
typed `SiteConfig` contract (information architecture +
home data), a single base-path `href` resolver, a
config-loading CLI (the `plggpress` bin), a build
pipeline with a build-time dead-link checker, and —
when run as a persistent process — the dynamic subtrees
that make it a CMS: a delivery API, authentication, an
admin UI, retrieval and a voice agent, an MCP server,
and a Claude Code plugin export.

The public reader and the served platform are **one
render path** (decision D5): the same `site.config.ts`,
`loadConfig`, and `pressRouter` serve byte-identical
HTML whether built to static files or served live.

## Writing an app with it

A site is a `site.config.ts` validated at the boundary
(this guide's own config, abbreviated):

```typescript
import { defineSite } from "plggpress";

const config = {
  base: process.env.DOCS_BASE ?? "/",
  title: "plgg",
  nav: [/* … */],
  sidebar: [/* … */],
};

// Ok is a typed SiteConfig; Err names the bad field
export const site = defineSite(config);
export default config;
```

Then one of three modes — all sharing that one config
and router, so served HTML equals built HTML:

| Mode      | Command                       | What it is                                                                                                                                    |
| --------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **build** | `plggpress build`             | SSG — render every route to static files (the public reader, served over a CDN).                                                              |
| **serve** | `plggpress serve --port 3000` | A persistent `node:http` instance rendering the same router live; the mount point for the dynamic `/api`, `/admin`, `/auth`, `/mcp` subtrees. |
| **dev**   | `plgg-bundle dev`             | Authoring hot-reload — a toolchain concern, not a plggpress command.                                                                          |

## The served platform

`serve` runs the SSG router and, when configured, mounts
the CMS subtrees. Each is documented on its own page:

- **[Content & delivery](/packages/plggpress/content-delivery)**
  — the git-primary corpus, the derived
  [plgg-content](/packages/plgg-content) SQLite index,
  frontmatter content models, and the MicroCMS-like
  `/api` delivery + FTS5 search.
- **[Auth & admin](/packages/plggpress/auth-admin)** —
  OIDC OP+RP over [plgg-auth](/packages/plgg-auth), the
  account domain, the scheduler-declared `/admin` UI,
  and the DB-primary stakeholder / drafts / media
  domains.
- **[Agent surfaces](/packages/plggpress/agent-surfaces)**
  — opt-in RAG, the browser voice agent, the
  [plgg-mcp](/packages/plgg-mcp) server over stdio and
  OAuth-protected HTTP, and the Claude Code plugin
  export.
- **[Operations](/packages/plggpress/operations)** — how
  the served instance stays up: the cloudflared front,
  SQLite WAL + single-writer, backup/restore, the
  health probe, and graceful degradation when keys are
  absent.

## Vocabulary

- **SiteConfig** — the typed IA + home-data contract and
  its `asSiteConfig` / `defineSite` boundary validators.
- **Href** — the single base-path link resolver (`href`,
  `isExternalHref`) every internal link routes through.
- **CheckLinks** — `collectPageLinks` + `checkLinks`,
  the pure dead-link pass that fails the build on any
  broken internal link or bad fragment.
- **Press** — `PressOptions`, the `BuildReport`, the
  error vocabulary; **build** + **loadConfig** drive a
  run, **theme** / **router** render pages.
- **serve** — `pressServer` mounts the router and the
  optional dynamic subtrees behind one origin.

## Why it exists

plggpress began as an in-house VitePress replacement so
the plgg family could document itself with no
third-party site generator (see the
[history](/packages/plgg/)). The roadmap then grew it
into a content platform to prove the family end to
end — content indexing and search, authentication,
admin, retrieval, voice, and MCP — all vendor-neutral
and built on plgg (`plgg`, WebCrypto, `node:sqlite`).

plggpress carries a small generic web **framework**
internally (`src/framework/`, config loading + router
builder + static-build/CLI orchestration, absorbed from
the retired plggmatic app-framework facade). The name
[plggmatic](/packages/plggmatic/) now belongs to the UI
design framework; the served admin UI is declared on
its scheduler.
