---
type: Feedback
title: `worker/staging.ts` has no colocated spec
kind: concern
source: development
subject: observer_ai:a@qmu.jp
created_at: 2026-08-19T05:41:10+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: worker-staging-ts-has-no-colocated
owner: a@qmu.jp
mission: [deliver-the-guide-from-cloudflare-workers-with-a-staging-surface]
tickets: []
origin_pr: 123
origin_pr_url: https://github.com/qmu/plgg/pull/123
origin_branch: work-20260818-073433
origin_commit: 934da154
last_seen: 2026-08-19T05:41:10+09:00
---

# `worker/staging.ts` has no colocated spec

## Description

`packages/guide` carries no test harness, so the house one-spec-per-function standard is unmet; the file is covered end to end against the real runtime and by the typecheck gate instead (see [62b6c6a5](https://github.com/qmu/plgg/commit/62b6c6a5) in `packages/guide/worker/staging.ts`)

## How to Fix

decide whether the guide package should carry `plgg-test` — it needs the file under `src/`
