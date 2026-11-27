# @plgg/guide

The user guide for plgg and its libraries. Japanese manuscripts live in
[site/ja](site/ja) and English manuscripts in [site/en](site/en). Use the
same filenames and internal link paths in both editions.
[site.config.ts](site.config.ts) selects the base, labels, and sidebar
from `SITE_LOCALE`.

## Build and serve

From a fresh checkout, run `sh scripts/build.sh` at the repository root
to prepare the libraries and reference exhibit. From this package, run:

```sh
npm run dev                 # Japanese
SITE_LOCALE=en npm run dev  # English
npm run build
npm run preview
```

The build checks each edition's internal links and writes Japanese to
`dist/`, then English to `dist/en/`. Finally, `nest-exhibit.ts` copies
the reference exhibit to `dist/plggmatic-reference/`. Preview the
combined output to try the language switch.

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
