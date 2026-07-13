---
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
created_at: 2026-06-26T21:43:57+09:00
last_seen: 2026-06-26T21:43:57+09:00
first_seen: 2026-06-26T21:43:57+09:00
concern_id: workaholic-specs-infrastructure-md-count-drift
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# (carried from PR #37) Workaholic specs infrastructure.md count drift

## Description

`.workaholic/specs/infrastructure.md` still reads "four packages" (line 99); the doc inventory was not refreshed.

## How to Fix

Update `infrastructure.md` to reflect the current package count and architecture; audit for other inventory drift.
