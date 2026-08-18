---
type: Feedback
title: "[FB] Implement staging-plgg.qmu.co.jp Cloudflare Worker auto-deploy on merge to main"
kind: instruction
source: slack
subject: person:a@qmu.jp
created_at: 2026-08-18T12:12:00+00:00
author: a@qmu.jp
assignee: "@tamurayoshiya"
supersedes:
---

# [FB] Implement staging-plgg.qmu.co.jp Cloudflare Worker auto-deploy on merge to main

Requested in Slack by tamura_yoshiya (`a@qmu.jp` / GitHub `@tamurayoshiya`): move the design captured in
`.workaholic/feedbacks/20260818071835-move-the-guide-to-cloudflare-workers-with-a-staging-plgg-qmu-co-jp-staging-surface.md`
(itself superseding `20260817210723-move-the-guide-to-cloudflare-workers-with-a-staging-plgg-guide-qmu-dev-staging-surface.md`)
from proposal to implementation now.

That prior record documents two instructions for the guide (`packages/guide`, production
https://plgg.qmu.co.jp/):

1. Serve staging at `staging-plgg.qmu.co.jp` — one level under the same `qmu.co.jp` zone as
   production, so it is covered by the zone's Universal SSL (`*.qmu.co.jp`) without a separate
   certificate. DNS for the `qmu.co.jp` zone is Terraform-managed in the corporate repository
   under `infra/terraform/cloudflare-dns/`.
2. Retire the production GitHub Pages deploy (`.github/workflows/deploy-guide.yml` →
   `actions/deploy-pages`) in favor of a Cloudflare Worker that deploys automatically on every
   merge to `main`. `qmu-co-jp`'s `packages/site`, which already ships via `wrangler deploy`, is
   the reference shape for the Worker deployment.

This feedback is the actionable request: build and ship the above — the staging Worker at
`staging-plgg.qmu.co.jp`, the corresponding DNS record(s) in the corporate repo's
`infra/terraform/cloudflare-dns/`, and the production cutover from GitHub Pages to a Cloudflare
Worker auto-deployed on merge to `main` — rather than leaving it as an unimplemented design
proposal.
