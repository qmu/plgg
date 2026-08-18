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

The built site is served by **Cloudflare Workers** defined
in this package by [`wrangler.jsonc`](wrangler.jsonc). Two
surfaces, one build:

| Surface | Hostname | Worker | Fed by |
| --- | --- | --- | --- |
| Production | `plgg.qmu.co.jp` | `plgg-guide` | every merge to `main` that touches `packages/**`, via `.github/workflows/deploy-guide.yml` |
| Staging | `staging-plgg.qmu.co.jp` | `plgg-guide-staging` | `npm run deploy:staging`, by hand — deliberately not wired to a branch yet |

```bash
# Serve dist/ through the real Worker runtime (workerd),
# locally, with no Cloudflare account needed.
npm run serve:worker            # production shape
npm run serve:worker:staging    # staging shape

# Publish dist/. Needs Cloudflare credentials
# (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID).
npm run build && npm run deploy
npm run build && npm run deploy:staging
```

Both surfaces serve the **same** `dist/` — a staging
surface that previews a different artifact is not
previewing anything. `dist/` is a build product and stays
untracked; `wrangler deploy` uploads whatever
`npm run build` last produced.

**Production has no Worker script.** plggpress emits a fully
static tree, and Cloudflare's Static Assets runtime is
configured to answer it the way GitHub Pages did —
`/getting-started` redirects to `/getting-started/` and
serves that directory's `index.html`
(`html_handling: "auto-trailing-slash"`), and a miss returns
the rendered `404.html` with a 404 status
(`not_found_handling: "404-page"`).

**Staging has one**, [`worker/staging.ts`](worker/staging.ts),
and only for the two things production must never have: an
`X-Robots-Tag: noindex` header on every response plus a
`/robots.txt` that disallows everything, and a fixed banner
marking the page as pre-production. Both are properties of
the response, so the build stays shared. The environment
sets `run_worker_first: true` — without it the asset server
answers real pages before the script runs, and only the 404
would be marked.

Hostnames are routes here and **records elsewhere**. The
`qmu.co.jp` zone's DNS is Terraform-managed in the corporate
repository (`infra/terraform/cloudflare-dns/`), so wrangler
owns the route and Terraform owns the record — never
`custom_domain: true`, which would give one record two
owners. A record must already be proxied through Cloudflare
before a deploy carrying its route is accepted, so the
Terraform change always lands first. Both hostnames are one
label under `qmu.co.jp` on purpose: Universal SSL's
`*.qmu.co.jp` covers them with no per-host certificate.

## Conventions

Doc-authoring rules — page structure, the "code samples come
from real code" rule, and how the IA in `site.config.ts` is
the contract — live in
[`contributing/conventions.md`](contributing/conventions.md).
