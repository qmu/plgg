---
created_at: 2026-08-18T07:20:09+00:00
status: done
author: a@qmu.jp
assignees: [a@qmu.jp]
depends_on: [20260818072000-serve-the-guide-from-a-cloudflare-worker-in-this-repository.md]
mission: deliver-the-guide-from-cloudflare-workers-with-a-staging-surface
merge_policy:
verification_handoff: The staging hostname needs a DNS record in the corporate repository's infra/terraform/cloudflare-dns/ and a Cloudflare account the unattended run cannot reach, so the live https://staging-plgg.qmu.co.jp/ check runs on a person's machine.
---

# Stand up the staging surface at staging-plgg.qmu.co.jp

## Overview

PROPOSED. The guide has no pre-production surface: `packages/guide` has a local
dev server (`plggpress dev`, and the container in `workloads/guide`) and a
production site, with nothing in between. The instruction is to serve staging at
`staging-plgg.qmu.co.jp` — deliberately one level under the same `qmu.co.jp` zone
as production, because Universal SSL's `*.qmu.co.jp` covers a single label and no
per-host certificate is then needed. The `qmu.co.jp` zone's DNS is Terraform-
managed in the corporate repository's `infra/terraform/cloudflare-dns/`, so this
ticket's work is split across two repositories by design: the staging Worker
environment here, the DNS record there.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout
- `workaholic:implementation` / `policies/coding-standards.md` — style and structure conventions
- `workaholic:operation` — a second delivery environment for the same artifact
- `workaholic:design` — the staging surface must not be publicly indexable or
  mistakable for production

## Key Files

- `packages/guide/wrangler.*` (added by the first ticket) — where the staging
  environment is declared alongside production.
- `packages/guide/package.json` — a staging deploy entry point beside the
  production one.
- `.github/workflows/deploy-guide.yml` — where a staging deploy would be
  triggered from, if the mission's reviewer wants one wired.
- `packages/plggpress/OPERATIONS.md` — the topology documentation, which gains a
  second hostname.

## Implementation Steps

1. Declare a `staging` environment in the guide's wrangler configuration: its own
   Worker name and a route for `staging-plgg.qmu.co.jp`, serving the same built
   `dist` as production.
2. Add a staging deploy script to `packages/guide/package.json`, so both surfaces
   are published through repository-owned commands.
3. Raise the DNS change against the corporate repository's
   `infra/terraform/cloudflare-dns/` — a proxied record for
   `staging-plgg.qmu.co.jp` in the `qmu.co.jp` zone. This is a change in a
   different repository; use `/fb <the ask> to <owner/name>` rather than writing
   into any checkout of it.
4. Confirm TLS actually terminates on the Universal SSL certificate — the whole
   reason the hostname is one label deep. If it does not, stop and report rather
   than provisioning a certificate as a workaround; the hostname choice was the
   instruction's own reasoning and a failure there is worth the reporter knowing.
5. Keep staging out of search results (a `noindex` response header or
   `robots.txt` on the staging environment only) and make it visibly staging, so
   nobody reads it as the published guide.
6. Document both hostnames and which branch or trigger feeds each.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `https://staging-plgg.qmu.co.jp/` serves the guide over TLS on the
  `*.qmu.co.jp` Universal SSL certificate, with no per-host certificate issued.
- The staging environment is declared in this repository and deployable through a
  repository-owned script.
- Staging is not indexable and is distinguishable from production at a glance.

**Verification method** — the commands/tests/probes that prove them:

- `curl -sSI https://staging-plgg.qmu.co.jp/` for a 200 and the expected headers;
  `openssl s_client -connect staging-plgg.qmu.co.jp:443` (or the browser's
  certificate view) for the covering certificate.
- The merged Terraform change in the corporate repository as the record of the
  DNS record.

**Gate** — what must pass before approval:

- The live checks above pass **on a person's machine with the Cloudflare account
  and the corporate repository in hand** — see `verification_handoff`.

## Considerations

- The two halves land in different repositories and cannot merge atomically; the
  Worker environment can be merged first and will simply have no reachable
  hostname until the DNS record follows.
- The name is `staging-plgg.qmu.co.jp`, superseding an earlier
  `staging-plgg-guide.qmu.dev` proposal from the same reporter — the record this
  mission cites carries that correction, so do not resurrect the `.qmu.dev` form
  from older notes or from `site.config.ts`'s `dev.allowedHosts`.
- Whether staging deploys automatically (and from what — a branch, a PR, a manual
  dispatch) is left to the mission's approval interrogation; this ticket only
  requires that the surface exists and is deployable.

## Final Report

The repository half is complete. The live half — the hostname, its TLS and the
DNS record — is the declared `verification_handoff` and is **not** done.

### What was built

`wrangler.jsonc` gains an `env.staging`: its own Worker (`plgg-guide-staging`),
its own route (`staging-plgg.qmu.co.jp/*` in the `qmu.co.jp` zone), `workers_dev`
**off**, and the same `dist/` production serves. `package.json` gains
`deploy:staging` and `serve:worker:staging`, so both surfaces publish through
repository-owned commands.

Every `assets` key is repeated verbatim inside the environment rather than left
to inherit. wrangler does not inherit `assets` into an environment, and a
half-inherited one would have given staging different 404 and trailing-slash
rules than the surface it previews — the one difference a staging surface must
never have.

### Design decision: staging is the only environment with a script

Production stays assets-only. Staging needs two things production must never
have — to stay out of search results, and to be unmistakable for the published
guide — and both are properties of the **response**, not of the content. So they
live in `worker/staging.ts`, in the one environment that wants them, and the
build stays shared and byte-identical across both surfaces.

The alternatives were considered and rejected: a `robots.txt` or a `_headers`
file in `dist/` would reach production too (telling crawlers to stay off the
published guide is the opposite of what production wants), and a staging-only
copy of `dist/` mutated at deploy time would leave a staging-flavoured build
sitting in the tree for the next production deploy to pick up.

### The finding that mattered: `run_worker_first`

Measured, not assumed. With the environment first written the obvious way, the
probes came back: `/` and `/concepts/option/` served **200 with no `X-Robots-Tag`
and no banner**, while `/no-such-page` had both. Cloudflare's asset server
answers a matching request *before* the Worker runs, so the script only ever saw
misses — staging would have shipped looking marked while every real page was
unmarked and indexable. `assets.run_worker_first: true` on the staging
environment fixes it; production, having no script, is untouched by the setting.

### Open question left open, deliberately

Whether staging deploys automatically, and from what, is the mission's approval
interrogation to settle — the ticket says so explicitly. So nothing was wired:
staging deploys by hand with `npm run deploy:staging`, and the README's surface
table says exactly that. Wiring it to a branch or a `workflow_dispatch` is a
one-job addition to `deploy-guide.yml` whenever the answer exists.

### One reviewer's call, recorded rather than taken

`worker/staging.ts` has **no colocated `*.spec.ts`**, which the house testing
standard would normally ask for. `packages/guide` carries no test harness at
all — adding one means a `plgg-test` dependency, moving the file under `src/`
(the runner accepts only the exact `plgg-test src` script), and a new entry in
the CI test pool, for one 60-line edge shim. It is instead covered end to end
against the real runtime: `wrangler dev --env staging` with five probes, which
for an HTTP response decorator tests more than a unit test would. Standing up a
harness in the guide package is a judgment worth a person's ruling, so it is
recorded here rather than decided by an unattended run. The file **is** covered
by the whole-repo typecheck gate — see below.

### What a person must still do (the `verification_handoff`)

1. Raise the DNS change in the corporate repository's
   `infra/terraform/cloudflare-dns/`: `staging-plgg.qmu.co.jp`, **proxied**, in
   the `qmu.co.jp` zone. This session could not raise it — filing into another
   repository requires a verbatim human confirmation an unattended run has no way
   to give, and this session's GitHub access is scoped to `qmu/plgg`.
2. `npm run build && npm run deploy:staging`, then confirm TLS terminates on the
   **`*.qmu.co.jp` Universal SSL** certificate with no per-host issuance:
   `openssl s_client -connect staging-plgg.qmu.co.jp:443` or the browser's
   certificate view. If it does not, **stop and report** rather than provisioning
   a certificate — the one-label hostname was the instruction's own reasoning and
   a failure there is worth the reporter knowing.
3. `curl -sSI https://staging-plgg.qmu.co.jp/` for the 200 and
   `x-robots-tag: noindex, nofollow, noarchive`, and `/robots.txt` for the
   disallow-all body.

### Discovered Insights

- **Insight**: Cloudflare Static Assets serves matching assets **before** the
  Worker script unless `assets.run_worker_first` is set; a scripted assets Worker
  written without it silently degrades to a 404-only handler.
  **Context**: this is invisible in code review and invisible in a dry run — only
  a probe against a *real* page catches it. Any future response-decorating Worker
  in this family needs the same setting and the same probe.
- **Insight**: `packages/guide` had no `tsconfig.json`, so nothing under it was
  ever typechecked — including `site.config.ts`. It now has one, scoped to
  `worker/**` and typed by `@cloudflare/workers-types` rather than `@types/node`,
  which is what put the Worker inside `node scripts/typecheck.ts`.
  **Context**: the gate discovers packages by the presence of a
  `tsconfig.json`, so a package without one is silently exempt rather than
  reported. `site.config.ts` is still outside any typecheck; pulling it in is a
  separate question, because it would be checked under options that differ from
  the plggpress program that actually loads it.
- **Insight**: with more than one environment declared, `wrangler deploy` warns
  that the target is ambiguous and asks for an explicit `--env`. The production
  script is therefore `wrangler deploy --env=""`, which names the top-level
  environment.
  **Context**: without it, CI's deploy log carries a standing warning about the
  one thing nobody wants ambiguous — which environment production just published
  to.
