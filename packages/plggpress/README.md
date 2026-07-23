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
app-framework facade; the design-system package now lives
outside this monorepo).
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
`plgg-highlight`, `plgg-cli`) and is ESM-only. The static
theme support used by the guide is local to plggpress.

## Usage

Three modes, **one `site.config.ts`, one `loadConfig`, one
`pressRouter`** — served HTML is byte-identical to built HTML:

| Mode | Command | What it is |
| --- | --- | --- |
| **build** | `plggpress build --config site.config.ts --contentDir . --outDir dist` | SSG — renders every route to static files (the public reader path, served over a CDN). |
| **serve** | `plggpress serve --config site.config.ts --contentDir . --port 3000` | A persistent `node:http` instance rendering the SAME router live; config loaded once at startup, no watch. The mount point for the later `/api`, `/admin`, `/auth`, `/mcp` subtrees (`server/pressServer.ts`). |
| **dev** | `plggpress dev [--contentDir docs] [--config site.config.ts] [--port 5173] [--host tunnel.example.dev] [--watch-theme]` | Authoring hot-reload — the same router, re-imported on every edit to `--contentDir` / `--config`, with the browser reloaded over SSE. `serve` is not its return (no watch, no re-import). |

`dev` needs **no wiring**: run it in a docs repo whose only
dependency is plggpress and it serves. It defaults to `docs/`
when the repo has one and the working directory otherwise
(`--contentDir` settles the rest), finds the theme from the
running CLI's own location, and watches only your content —
`--watch-theme` opts into watching plggpress's source, for
co-developing the theme itself.

This reverses an earlier stance ("hot-reload is a toolchain
concern; plggpress ships no `dev` command"). The layering it
defended is intact — the dev LOOP is still `plgg-bundle`'s,
reached across a seam that hands it a plan — but the paperwork
it implied was not: every consumer had to hand-write a
`bundle.config.ts`, a `devEntry.ts`, and take a bundler
dependency to read their own Markdown. Removing that friction
is what plggpress is for, so the command moved and the
ownership did not.

**dev is for authoring, not hosting.** Production stays
`plggpress build` (SSG/CDN) or `plgg-cms`'s `serve`.

## Config: imports, srcExclude & link-ignore

**Extensionless relative imports in `site.config.ts` work.**
The CLI launcher registers a resolver hook, so a config that
sources its IA from a shared module — `import { nav } from
"../ia/nav"` — resolves the `.ts` (or `/index.ts`) without an
explicit extension, the same spelling vite/VitePress accept.
(The hook is registered by `bin/plggpress.mjs`, so this
applies when the config is loaded through the `plggpress` CLI.)

**Excluding side files and ignoring non-page links.** Two
optional `SiteConfig` fields, both `None` by default (so
existing configs are unchanged), take minimal glob patterns
(`*` within a segment, `**` across, `?` one char):

- `srcExclude` — glob patterns matched against **routes**;
  a matching page is not built (drafts, fixtures, redirect
  stubs). VitePress's `srcExclude` role.
- `linkIgnore` — glob patterns of internal link targets the
  dead-link checker **skips**, for a page that links to an
  existing non-page file the pure checker can't see (a
  download, a co-located data file at an extensionless path).
  (Targets whose path already carries an extension — a
  `.json`, `.png` — and the 404 page are exempt already.)

```ts
export default defineSite({
  // …
  srcExclude: ["/drafts/**", "/**/fixtures/**"],
  linkIgnore: ["/downloads/**"],
});
```

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root
  `CLAUDE.md`); untrusted config crosses into the typed core
  through `defineSite`.
- After editing a `file:`-linked dependency's source, rebuild
  its `dist` or this package won't see new exports.
