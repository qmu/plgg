---
type: Mission
title: Deliver the guide from Cloudflare Workers with a staging surface
slug: deliver-the-guide-from-cloudflare-workers-with-a-staging-surface
status: active
merge_policy:
created_at: 2026-08-18T07:19:33+00:00
author: a@qmu.jp
assignees: [a@qmu.jp]
assignee:
predicted_hours:
actual_hours:
feedback: [20260818071835-move-the-guide-to-cloudflare-workers-with-a-staging-plgg-qmu-co-jp-staging-surface.md]
tickets: []
stories: []
gate_type:
gate_target:
gate_assert:
claim: work-20260818-073433
---

# Deliver the guide from Cloudflare Workers with a staging surface

## Goal

The guide (`packages/guide`) is published to GitHub Pages by
`.github/workflows/deploy-guide.yml` (`actions/deploy-pages`), and it has no
staging surface at all. The instruction asks for both halves to move: production
served by a Cloudflare Worker deployed automatically on merge to `main`, and a
staging surface at `staging-plgg.qmu.co.jp` — one level under the same
`qmu.co.jp` zone as production, so Universal SSL's `*.qmu.co.jp` covers it. The
`qmu.co.jp` zone's DNS is Terraform-managed in the corporate repository
(`infra/terraform/cloudflare-dns/`), outside this checkout.

## Experience

Merging to `main` builds the guide and deploys it to the production Worker with
no Pages step in the path; `https://plgg.qmu.co.jp/` serves the same site it does
today. A pre-production build is reachable at `https://staging-plgg.qmu.co.jp/`
over TLS, without a per-host certificate. Retiring `deploy-guide.yml` leaves no
second publisher of the same site.

## Acceptance

<!-- PROPOSED — a sketch for the reviewer to interrogate, not a plan. -->

- [ ] The guide's build output is served by a Cloudflare Worker defined in this
      repository, deployable with `wrangler deploy`. (#20260818072000-serve-the-guide-from-a-cloudflare-worker-in-this-repository.md)
- [ ] A merge to `main` that touches the guide or the packages deploys production
      automatically, and the GitHub Pages path is removed. (#20260818072004-deploy-the-guide-to-the-production-worker-on-merge-and-retire-github-pages.md)
- [ ] `staging-plgg.qmu.co.jp` serves a staging build over TLS, with the DNS
      change raised against the corporate Terraform repository. (#20260818072009-stand-up-the-staging-surface-at-staging-plgg-qmu-co-jp.md)

## Changelog

<!-- Append-only, dated timeline. One line per event; never rewrite past lines. -->
