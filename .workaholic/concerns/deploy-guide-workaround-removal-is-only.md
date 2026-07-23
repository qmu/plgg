---
origin_pr: 47
origin_pr_url: https://github.com/qmu/plgg/pull/47
origin_branch: work-20260626-221353
origin_commit: 3adc809
created_at: 2026-06-27T19:52:31+09:00
last_seen: 2026-07-03T02:00:50+09:00
first_seen: 2026-06-27T19:52:31+09:00
concern_id: deploy-guide-workaround-removal-is-only
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# Deploy-guide workaround removal is only confirmable post-merge

## Description

ticket 3-5 removed the deploy-guide `rm -f package-lock.json` workaround and switched the loop to `npm ci`, but `deploy-guide.yml` runs **post-merge only** (push to `main`), so its real-push green can't be confirmed before merge (see [555ca55](https://github.com/qmu/plgg/commit/555ca55) in `.github/workflows/deploy-guide.yml`). It was proven safe locally (clean `npm ci && npm run build` builds with zero rolldown/native-binding error).

## How to Fix

at ship time, watch the post-merge `Deploy Guide` run and confirm `https://qmu.github.io/plgg/` renders; if it fails, revert the workaround removal (the rollback is the prior commit).
