---
created_at: 2026-08-18T07:20:04+00:00
author: a@qmu.jp
assignees: [a@qmu.jp]
depends_on: [20260818072000-serve-the-guide-from-a-cloudflare-worker-in-this-repository.md]
mission: deliver-the-guide-from-cloudflare-workers-with-a-staging-surface
merge_policy:
verification_handoff: The cutover needs the Cloudflare account and a CLOUDFLARE_API_TOKEN repository secret, plus the plgg.qmu.co.jp DNS record in the corporate repository's infra/terraform/cloudflare-dns/ — none of which an unattended run holds.
---

# Deploy the guide to the production Worker on merge and retire GitHub Pages

## Overview

PROPOSED. `.github/workflows/deploy-guide.yml` builds the guide on every push to
`main` touching `packages/**` and publishes it with
`actions/upload-pages-artifact` + `actions/deploy-pages`; the Pages custom domain
`plgg.qmu.co.jp` is configured on the repository. The instruction is to stop using
GitHub Pages and have a merge to `main` deploy the Worker automatically instead.
This ticket replaces the publishing half of that workflow with a `wrangler deploy`
of the Worker the previous ticket defined, and removes the Pages path so the site
has exactly one publisher.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout
- `workaholic:implementation` / `policies/coding-standards.md` — style and structure conventions
- `workaholic:operation` — the delivery path itself is what this ticket changes
- `workaholic:safety` — a deploy credential enters CI here; it must be a repository
  secret with the narrowest scope that works, never inlined

## Key Files

- `.github/workflows/deploy-guide.yml` — the workflow to rewrite: keep the build
  job and its trigger paths verbatim (`./scripts/npm-install.sh`,
  `./scripts/build.sh`, the plggpress build), replace the upload/deploy steps.
- `packages/guide/package.json` — the deploy script the previous ticket added; CI
  calls it rather than embedding a wrangler invocation.
- `packages/guide/site.config.ts` — `base` defaults to `/` and the Pages comment
  above it (`DOCS_BASE` for a project site) becomes stale once Pages is gone;
  correct the comment rather than leaving it to mislead.
- `packages/plggpress/OPERATIONS.md` — the delivery documentation to update.

## Implementation Steps

1. Confirm the current live state before touching anything: which workflow run
   last published `plgg.qmu.co.jp`, and what the Pages custom-domain setting is.
   Write it down — the rollback is "restore this file and re-enable Pages", and
   that is only true if the starting state is recorded.
2. Rewrite `deploy-guide.yml`: keep `on.push.branches`, `on.push.paths` and
   `workflow_dispatch` as they are; keep the build steps unchanged; replace the
   `pages: write` / `id-token: write` permissions and the two Pages actions with a
   deploy step that runs the guide's own deploy script, authenticated by a
   `CLOUDFLARE_API_TOKEN` (and account id) repository secret.
3. Keep the `concurrency: deploy-guide` group so two merges cannot deploy at once.
4. Remove the GitHub Pages path completely once the Worker is confirmed serving:
   the `github-pages` environment reference in the workflow, and the repository's
   Pages configuration and custom domain. Two publishers for one hostname is the
   failure this step exists to prevent.
5. Point `plgg.qmu.co.jp` at the Worker. The record lives in the corporate
   repository's `infra/terraform/cloudflare-dns/`, so this is a change raised
   there, not here — and it is the moment the site is actually cut over.
6. Update `OPERATIONS.md` and the stale `DOCS_BASE`/Pages comments in
   `site.config.ts` in the same change.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- A merge to `main` touching the guide deploys the production Worker with no
  manual step, and the workflow contains no `actions/deploy-pages` or
  `upload-pages-artifact` step.
- `https://plgg.qmu.co.jp/` serves the Worker build over TLS, with the landing
  page, a nested page and a generated package-reference page all resolving.
- No GitHub Pages deployment can still publish that hostname.

**Verification method** — the commands/tests/probes that prove them:

- The workflow run's own log for a merge to `main` (a deploy step that succeeded).
- `curl -sSI https://plgg.qmu.co.jp/` and two nested URLs, checked for a 200 and a
  Worker-served response rather than a Pages one.
- The repository's Pages settings read after the change.

**Gate** — what must pass before approval:

- The live checks above pass **on a person's machine with the Cloudflare account
  in hand** — see `verification_handoff`. This unit is handed off, not merged and
  announced verified by an unattended run.

## Considerations

- **Cutover downtime is a known, recorded risk here.** The last time this
  hostname's CNAME moved, certificate issuance left a window of unavailability
  (`.workaholic/feedbacks/20260703173114-degraded-window-between-cname-flip-and.md`).
  `plgg.qmu.co.jp` is one level under `qmu.co.jp`, so Universal SSL's
  `*.qmu.co.jp` should cover it without a fresh issuance — confirm that before the
  flip rather than after, and pick a quiet moment regardless.
- Sequencing matters: deploy the Worker and prove it on its `workers.dev` (or the
  staging hostname from the next ticket) *before* moving the production DNS
  record, so the flip is the last and most reversible act.
- The `CLOUDFLARE_API_TOKEN` secret is new to this repository; scope it to Workers
  deployment for this account only.
