---
type: Feedback
title: Implement staging-plgg.qmu.co.jp Cloudflare Worker auto-deploy on merge to main
kind: instruction
source: discussion
subject: person:a@qmu.jp
created_at: 2026-08-18T13:21:05+00:00
author: a@qmu.jp
supersedes: 
---

# Implement staging-plgg.qmu.co.jp Cloudflare Worker auto-deploy on merge to main

Source: https://github.com/qmu/plgg/issues/126

Issue #126 (filed by the `claude[bot]` app, restating the operator instruction already
captured in
`.workaholic/feedbacks/20260818071835-move-the-guide-to-cloudflare-workers-with-a-staging-plgg-qmu-co-jp-staging-surface.md`)
asks for the guide (`packages/guide`, production https://plgg.qmu.co.jp/) to be deployed
automatically to a Cloudflare Worker on every merge to `main`, and for a
`staging-plgg.qmu.co.jp` staging surface to be stood up.

The two halves it names are the same two the design record states: (1) staging at
`staging-plgg.qmu.co.jp` — one level under the same `qmu.co.jp` zone as production, so
Universal SSL `*.qmu.co.jp` covers it; DNS for that zone is Terraform-managed in the
corporate repository under `infra/terraform/cloudflare-dns/`; (2) production moves off
GitHub Pages (`.github/workflows/deploy-guide.yml` → `actions/deploy-pages`) to a
Cloudflare Worker deploy on merge to `main`, with the `qmu-co-jp` repository's
`packages/site` (`wrangler deploy`) as the reference shape.

It supersedes nothing new: the hostname correction from `staging-plgg-guide.qmu.dev` to
`staging-plgg.qmu.co.jp` is already carried by the 20260818071835 record.

Subject note: the GitHub author of the issue is the `claude[bot]` app, but the opinion
recorded here is the operator's (a@qmu.jp) — the issue is a machine relay of the design
record whose own subject is `person:a@qmu.jp`, so the subject axis names the person who
holds it rather than the relay.
