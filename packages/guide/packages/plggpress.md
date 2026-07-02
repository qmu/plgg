# plggpress

A **VitePress-like static-site generator**, built from
scratch on the plgg family as a thin
[plggmatic](/packages/plggmatic) consumer. It owns a
typed `SiteConfig` contract (information architecture +
home data), a single base-path `href` resolver, a
config-loading CLI (the `plggpress` bin), and a build
pipeline with a **build-time dead-link checker**. It is
the engine that builds **this guide**.

## Why it exists

plggmatic supplies the framework skeleton; plggpress
supplies the docs-site specifics on top of it — the
`SiteConfig` type and the `defineSite` validator that
this guide's `site.config.ts` imports, plus the content
pipeline that turns Markdown into pages:

```
plggmatic ── plggpress ── this guide
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
