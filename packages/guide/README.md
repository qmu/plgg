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

The hot-reloading dev server is reachable at
`plgg-guide.qmu.dev` (host port `5181`) through the shared
cloudflared tunnel. The build depends on
[`plggpress`](../plggpress/) and the dev server on
[`plgg-bundle`](../plgg-bundle/); both are `file:`-linked
workspace packages.

## Delivery

The built site is served by a **Cloudflare Worker** defined
in this package by [`wrangler.jsonc`](wrangler.jsonc):

```bash
# Serve dist/ through the real Worker runtime (workerd),
# locally, with no Cloudflare account needed.
npm run serve:worker

# Publish dist/ to the production Worker. Needs Cloudflare
# credentials (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID).
npm run build && npm run deploy
```

The Worker has no script of its own: plggpress emits a
fully static tree, and Cloudflare's Static Assets runtime is
configured to answer it the way GitHub Pages does today —
`/getting-started` redirects to `/getting-started/` and
serves that directory's `index.html`
(`html_handling: "auto-trailing-slash"`), and a miss returns
the rendered `404.html` with a 404 status
(`not_found_handling: "404-page"`). `dist/` is a build
product and stays untracked; `wrangler deploy` uploads
whatever `npm run build` last produced.

Hostnames are **not** declared here. The `qmu.co.jp` zone's
DNS is Terraform-managed in the corporate repository
(`infra/terraform/cloudflare-dns/`), so the Worker publishes
to its `*.workers.dev` subdomain and the routes that put it
behind `plgg.qmu.co.jp` are a separate, deliberately
reversible cutover.

## Conventions

Doc-authoring rules — page structure, the "code samples come
from real code" rule, and how the IA in `site.config.ts` is
the contract — live in
[`contributing/conventions.md`](contributing/conventions.md).
