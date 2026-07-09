# plggpress

The **static-site generator that builds this guide** and
the framework seam that [plgg-cms](/packages/plgg-cms)
mounts around. Built from scratch on the plgg family,
plggpress owns a typed `SiteConfig` contract
(information architecture + home data), a single
base-path `href` resolver, a config-loading CLI (the
`plggpress` bin), a build pipeline with a build-time
dead-link checker, and the `plggpress/framework` subpath
used by the dynamic CMS package.

The dynamic content platform no longer lives in
plggpress. The always-on CMS process, delivery API,
auth/admin surfaces, MCP, plugin export, ops, and agents
are owned by [plgg-cms](/packages/plgg-cms).

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

The current public package exposes the static build path.
The dynamic served path is composed by plgg-cms around the
framework subpath:

| Mode      | Command                       | What it is                                                                                                                                    |
| --------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **build** | `plggpress build` | SSG — render every route to static files (the public reader, served over a CDN). |
| **serve** | `plgg-cms serve` | Persistent `node:http` process that composes `plggpress/framework` with `/api`, `/admin`, `/auth`, `/mcp`, ops, and agent surfaces. |
| **dev** | `plgg-bundle dev` | Authoring hot-reload — a toolchain concern, not a plggpress command. |

## The CMS package

[plgg-cms](/packages/plgg-cms) runs the persistent CMS
process. These pages are currently kept beside plggpress
because they describe the served counterpart of the static
site generator:

- **[Content & delivery](/packages/plggpress/content-delivery)**
  — the git-primary corpus, the CMS-owned derived SQLite
  index, frontmatter content models, and the MicroCMS-like
  `/api` delivery + FTS5 search.
- **[Auth & admin](/packages/plggpress/auth-admin)** —
  OIDC OP+RP over [plgg-auth](/packages/plgg-auth), the
  account domain, the scheduler-declared `/admin` UI,
  and the DB-primary stakeholder / drafts / media
  domains.
- **[Agent surfaces](/packages/plggpress/agent-surfaces)**
  — opt-in RAG, the browser voice agent, the CMS-owned MCP
  protocol/tools over stdio and OAuth-protected HTTP, and
  the Claude Code plugin export.
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
the retired plggmatic app-framework facade). The served
admin UI is now documented as a [plgg-cms](/packages/plgg-cms)
surface declared with [plgg-ui](/packages/plgg-ui).
