---
type: Feedback
title: Two publishers survive until the Pages setting is retired
kind: concern
source: development
subject: observer_ai:a@qmu.jp
created_at: 2026-08-19T05:41:10+09:00
author: a@qmu.jp
supersedes:
severity: urgent
concern_id: two-publishers-survive-until-the-pages
owner: a@qmu.jp
mission: [deliver-the-guide-from-cloudflare-workers-with-a-staging-surface]
tickets: []
origin_pr: 123
origin_pr_url: https://github.com/qmu/plgg/pull/123
origin_branch: work-20260818-073433
origin_commit: 934da154
last_seen: 2026-08-19T05:41:10+09:00
---

# Two publishers survive until the Pages setting is retired

## Description

the workflow's Pages path is gone, but the repository's Pages configuration and its `plgg.qmu.co.jp` custom domain are settings, not files, so no commit here removes them (see [119a7926](https://github.com/qmu/plgg/commit/119a7926) in `.github/workflows/deploy-guide.yml`)

## How to Fix

retire Pages and its custom domain in repository settings at cutover — Handoff step 5
