# @plgg/guide

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

The **official guide** for plgg and the plgg family — a static
documentation site, not a publishable library. Its content is
authored as Markdown (`index.md`, `getting-started.md`,
`concepts/`, `contributing/`, `packages/`) and built into a
site by [`plggpress`](../plggpress/), the family's in-house
static-site generator.

## What it is

The site's information architecture and landing-page data live
in [`site.config.ts`](site.config.ts) as pure data validated
through plggpress's `defineSite` boundary — there is no
`vitepress` dependency. The prose pages under `concepts/` and
`packages/` are the guide's body; each family package has a
page there.

This package is private (`@plgg/guide`) and ships nothing to
npm; it exists to produce the rendered site.

## Build and serve

```bash
# Build the static site into dist/ (runs plggpress, which
# fails on any broken internal link).
npm run build

# Hot-reloading dev server (plgg-bundle dev).
npm run dev

# Preview the built dist/ over http.
npm run preview
```

The live site is served at `plgg-guide.qmu.dev` (host port
`5181`). The build depends on [`plggpress`](../plggpress/) and
the dev server on [`plgg-bundle`](../plgg-bundle/); both are
`file:`-linked workspace packages.

## Conventions

Doc-authoring rules — page structure, the "code samples come
from real code" rule, and how the IA in `site.config.ts` is
the contract — live in
[`contributing/conventions.md`](contributing/conventions.md).
