# plggpress

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

A **VitePress-like static-site generator**, built from scratch
on the plgg family. It owns a typed `SiteConfig` contract
(information architecture + home data), a single base-path
`href` resolver, a config-loading CLI (the `plggpress` bin),
and a build pipeline with a **build-time dead-link checker**.
It is the engine that builds [the guide](../guide/).

## Why this package exists

plggpress carries a generic web **framework** internally
(`src/framework/` — config loading, a router builder,
static-build + CLI orchestration, absorbed from the retired
`plggmatic` app-framework facade — the name `plggmatic` now
belongs to the standalone design-system repository).
That framework also wraps the whole mid-library stack (view,
server/http, md, highlight); plggpress supplies the docs-site
specifics on top of it — the `SiteConfig` type and the
`defineSite` validator a site's `site.config.ts` imports, plus
the content pipeline that turns Markdown into pages:

```
plgg ── (internal framework) ── plggpress ── a docs site (e.g. the guide)
```

## How it's organized

- **SiteConfig** — the typed IA + home-data contract and its
  `asSiteConfig` / `defineSite` boundary validators (`Ok` is a
  typed `SiteConfig`, `Err` names the offending field).
- **Href** — the single base-path link resolver (`href`,
  `isExternalHref`) every internal link routes through.
- **CheckLinks** — `collectPageLinks` + `checkLinks`, the pure
  dead-link pass that fails the build on any broken internal
  link or bad fragment.
- **Press** — `PressOptions`, the `BuildReport`, and the error
  vocabulary; **build** + **loadConfig** drive a run, and
  **theme** / **router** render the pages.

Content is parsed by [`plgg-md`](../plgg-md/) and highlighted
by [`plgg-highlight`](../plgg-highlight/); the output is served
through [`plgg-server`](../plgg-server/) — reached through the
internal framework facade (`plggpress/framework`, including its
`plggpress/framework/ssg` and `plggpress/framework/style`
subpaths). plggpress depends on the plgg family directly
(`plgg`, `plgg-http`, `plgg-server`, `plgg-view`, `plgg-md`,
`plgg-highlight`, `plgg-cli`) and is ESM-only.

## Usage

Three modes, **one `site.config.ts`, one `loadConfig`, one
`pressRouter`** — served HTML is byte-identical to built HTML:

| Mode | Command | What it is |
| --- | --- | --- |
| **build** | `plggpress build --config site.config.ts --contentDir . --outDir dist` | SSG — renders every route to static files (the public reader path, served over a CDN). |
| **serve** | `plggpress serve --config site.config.ts --contentDir . --port 3000` | A persistent `node:http` instance rendering the SAME router live; config loaded once at startup, no watch. The mount point for the later `/api`, `/admin`, `/auth`, `/mcp` subtrees (`server/pressServer.ts`). |
| **dev** | `plgg-bundle dev` (via the app's `devEntry.ts`) | Authoring hot-reload — a **toolchain** concern, not a plggpress command. plggpress ships no `dev` command; `serve` is not its return. |

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root
  `CLAUDE.md`); untrusted config crosses into the typed core
  through `defineSite`.
- After editing a `file:`-linked dependency's source, rebuild
  its `dist` or this package won't see new exports.
