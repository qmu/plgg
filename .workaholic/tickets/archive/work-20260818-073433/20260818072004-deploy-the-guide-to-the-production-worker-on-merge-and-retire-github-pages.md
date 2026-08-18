---
created_at: 2026-08-18T07:20:04+00:00
status: done
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

## Final Report

The repository half is complete. The live half is the declared
`verification_handoff` and is **not** done — see *What a person must still do*.

### Step 1: the starting state, recorded

The rollback is "restore this file and re-enable Pages", which is only true if
the starting state is written down:

- **Last Pages publish**: workflow run `31633532497`, `deploy-guide.yml`, push to
  `main`, `2026-08-12T19:37:09Z`, "Merge pull request #117 from
  qmu/work-20260812-224232", conclusion `success`. Every prior run of this
  workflow on `main` also succeeded, back through 2026-08-03.
- **Publisher shape**: `actions/upload-pages-artifact@v3` over
  `packages/guide/dist` in a `build` job, then `actions/deploy-pages@v4` in a
  `deploy` job bound to the `github-pages` environment, with `pages: write` and
  `id-token: write` permissions.
- **Custom domain**: `plgg.qmu.co.jp`, held as a **repository setting**, not as a
  file — there is no `CNAME` anywhere in the tree (checked). It is therefore not
  removable by this or any commit.
- **Live probe**: `curl -sSI https://plgg.qmu.co.jp/` could not run from this
  environment — outbound HTTPS goes through the agent proxy, which refused the
  host with `CONNECT tunnel failed, response 403`. The live state is recorded
  from the workflow history above, not from a probe, and that is exactly the gap
  the ticket's `verification_handoff` names.

### Design decision: who owns the hostname

`wrangler.jsonc` gains `routes: [{ pattern: "plgg.qmu.co.jp/*", zone_name:
"qmu.co.jp" }]` — deliberately **not** `custom_domain: true`. The custom-domain
form has wrangler create and hold the DNS record itself, which would put two
owners on one record: wrangler here and Terraform in the corporate repository's
`infra/terraform/cloudflare-dns/`. Splitting it — **wrangler owns the route,
Terraform owns the record** — leaves each resource with exactly one writer.

The cost of that split is an ordering constraint, and it is the cutover's whole
sequence: Cloudflare refuses a route whose hostname is not proxied through it, so
the Terraform change lands **first** and the deploy carrying the route lands
second. That is also the safer order on its own merits (the ticket's own
consideration): the Worker is provable on its `workers.dev` subdomain — which
`workers_dev: true` deliberately keeps on — before the record moves, so the flip
stays the last and most reversible act.

### Design decision: an absent secret fails loudly

The deploy step passes `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
straight from repository secrets and runs unconditionally. The obvious
alternative — gate the step on the secret being present so a secretless
repository stays green — was rejected: it produces a green run that published
nothing, which is worse than a red one, and it would hide the very prerequisite
the handoff exists to surface. Merging this before the secrets exist turns `main`
red on the first guide-touching push; that is why adding them is listed below as
a **pre-merge** step rather than a follow-up.

### What a person must still do (the `verification_handoff`)

1. Create the Cloudflare API token scoped to **Workers Scripts: Edit on this
   account only**, and add it plus the account id as the repository secrets
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. **Before merging.**
2. Raise the DNS change in the corporate repository's
   `infra/terraform/cloudflare-dns/`: `plgg.qmu.co.jp`, **proxied**, in the
   `qmu.co.jp` zone. This session could not raise it — filing into another
   repository requires a verbatim human confirmation an unattended run has no way
   to give, and this session's GitHub access is scoped to `qmu/plgg`, so the
   attempt would have been refused anyway.
3. Confirm before the flip, not after, that Universal SSL's `*.qmu.co.jp` already
   covers `plgg.qmu.co.jp` — one label deep, so it should, and that is precisely
   the assumption that cost a window of unavailability last time
   (`.workaholic/feedbacks/20260703173114-degraded-window-between-cname-flip-and.md`).
   Pick a quiet moment regardless.
4. Deploy and probe: `curl -sSI https://plgg.qmu.co.jp/` plus a nested page and a
   generated package-reference page, checking for 200 and a Worker-served
   response rather than a Pages one.
5. Retire GitHub Pages in the repository settings — the Pages configuration and
   the `plgg.qmu.co.jp` custom domain. This is a repository **setting**, reachable
   only through repository administration, so no commit in this PR can do it. Two
   publishers on one hostname is the failure step 4 of the ticket exists to
   prevent, so this is not optional cleanup.

### Discovered Insights

- **Insight**: the Pages custom domain for this repository is held in repository
  settings with no `CNAME` file in the tree, so retiring Pages is genuinely
  bimodal — the workflow half is a commit, the domain half is an administrative
  action, and a PR that only does the first leaves the site with two publishers.
  **Context**: any future "move a site off Pages" ticket in this family has the
  same shape. The commit is never the whole cutover.
- **Insight**: the build half of the old workflow needed two jobs only because
  Pages hands off through an artifact between them; `wrangler deploy` uploads
  from the same working tree, so build-and-publish collapses into one job with no
  artifact round-trip and no `id-token`/OIDC permission at all.
  **Context**: the new workflow's `permissions: contents: read` is not a
  tightening someone chose — it is all the workflow can now need, because the
  publish target left GitHub.
