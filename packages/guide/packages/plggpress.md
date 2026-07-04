# plggpress

A **VitePress-like static-site generator**, built from
scratch on the plgg family. It owns a typed `SiteConfig`
contract (information architecture + home data), a single
base-path `href` resolver, a config-loading CLI (the
`plggpress` bin), and a build pipeline with a
**build-time dead-link checker**. It is the engine that
builds **this guide**.

## Why it exists

plggpress carries a small generic **framework** internally
(config loading, a router builder, static-build + CLI
orchestration — absorbed from the retired `plggmatic`
app-framework facade; the name now belongs to the UI design
framework in `packages/plggmatic/`) and supplies the
docs-site specifics on top of it: the `SiteConfig` type
and the `defineSite` validator that this guide's
`site.config.ts` imports, plus the content pipeline that
turns Markdown into pages:

```
framework (internal) ── plggpress ── this guide
   plgg-md · plgg-highlight ─┘ (content)
```

## How it's organized

- **SiteConfig** — the typed IA + home-data contract and
  its `asSiteConfig` / `defineSite` boundary validators
  (`Ok` is a typed `SiteConfig`, `Err` names the
  offending field).
- **Href** — the single base-path link resolver (`href`,
  `isExternalHref`) every internal link routes through.
- **CheckLinks** — `collectPageLinks` + `checkLinks`, the
  pure dead-link pass that fails the build on any broken
  internal link or bad fragment.
- **Press** — `PressOptions`, the `BuildReport`, and the
  error vocabulary; **build** + **loadConfig** drive a
  run, and **theme** / **router** render the pages.

Content is parsed by [plgg-md](/packages/plgg-md) and
highlighted by [plgg-highlight](/packages/plgg-highlight);
the output is served through
[plgg-server](/packages/plgg-server). plggpress is
ESM-only. The exact config types and pipeline stages live
in the `plggpress` source.

## Three modes, one render path

plggpress answers an HTTP request three ways — all sharing
**one `site.config.ts`, one `loadConfig`, one
`pressRouter`**, so served HTML is byte-identical to built
HTML:

- **build** — `plggpress build` renders every route to
  static files (the public reader path, served over a CDN).
- **serve** — `plggpress serve --port 3000` runs a
  persistent `node:http` process rendering the SAME router
  live. Config is loaded once at startup (no watch). This
  served instance is the mount point the later dynamic
  features (`/api`, `/admin`, `/auth`, `/mcp`) attach to.
- **dev** — authoring hot-reload is a **toolchain** concern
  (`plgg-bundle dev` via `devEntry`), not a plggpress
  command; `serve` is the production instance, not a dev
  server.
