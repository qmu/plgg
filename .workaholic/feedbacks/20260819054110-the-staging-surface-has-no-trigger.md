---
type: Feedback
title: The staging surface has no trigger
kind: concern
source: development
subject: observer_ai:a@qmu.jp
created_at: 2026-08-19T05:41:10+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: the-staging-surface-has-no-trigger
owner: a@qmu.jp
mission: [deliver-the-guide-from-cloudflare-workers-with-a-staging-surface]
tickets: []
origin_pr: 123
origin_pr_url: https://github.com/qmu/plgg/pull/123
origin_branch: work-20260818-073433
origin_commit: 934da154
last_seen: 2026-08-19T05:41:10+09:00
---

# The staging surface has no trigger

## Description

staging deploys only by hand; the ticket left what should trigger it to the mission's approval interrogation (see [62b6c6a5](https://github.com/qmu/plgg/commit/62b6c6a5) in `packages/guide/package.json`)

## How to Fix

once decided, add one job to `deploy-guide.yml` calling `deploy:staging`
