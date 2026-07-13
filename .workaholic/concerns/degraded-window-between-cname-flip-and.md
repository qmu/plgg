---
type: Concern
origin_pr: 52
origin_pr_url: https://github.com/qmu/plgg/pull/52
origin_branch: work-20260703-020116
origin_commit: e859e23
created_at: 2026-07-03T04:11:11+09:00
last_seen: 2026-07-03T17:31:14+09:00
first_seen: 2026-07-03T04:11:11+09:00
concern_id: degraded-window-between-cname-flip-and
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# Degraded window between cname flip and root-base deploy

## Description

Setting the Pages custom domain immediately redirects qmu.github.io/plgg to the new domain while the served artifact still bakes the /plgg/ base, so internal links 404 until this branch's deploy lands — an unavoidable, short window (see [f5d8889](https://github.com/qmu/plgg/commit/f5d8889))

## How to Fix

Nothing retroactive; for future domain changes, flip the cname and merge the base change back-to-back (as done here)
