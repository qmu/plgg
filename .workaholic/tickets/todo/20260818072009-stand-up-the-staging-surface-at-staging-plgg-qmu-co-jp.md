---
created_at: 2026-08-18T07:20:09+00:00
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
