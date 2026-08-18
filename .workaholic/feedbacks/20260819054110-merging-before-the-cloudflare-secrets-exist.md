---
type: Feedback
title: Merging before the Cloudflare secrets exist turns `main` red
kind: concern
source: development
subject: observer_ai:a@qmu.jp
created_at: 2026-08-19T05:41:10+09:00
author: a@qmu.jp
supersedes:
severity: urgent
concern_id: merging-before-the-cloudflare-secrets-exist
owner: a@qmu.jp
mission: [deliver-the-guide-from-cloudflare-workers-with-a-staging-surface]
tickets: []
origin_pr: 123
origin_pr_url: https://github.com/qmu/plgg/pull/123
origin_branch: work-20260818-073433
origin_commit: 934da154
last_seen: 2026-08-19T05:41:10+09:00
---

# Merging before the Cloudflare secrets exist turns `main` red

## Description

the deploy step runs unconditionally and fails without `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`; gating it was rejected because a green run that published nothing is worse (see [119a7926](https://github.com/qmu/plgg/commit/119a7926) in `.github/workflows/deploy-guide.yml`)

## How to Fix

add both repository secrets before merging — Handoff step 1
