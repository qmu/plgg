---
origin_pr: 37
origin_pr_url: https://github.com/qmu/plgg/pull/37
origin_branch: work-20260528-143038
origin_commit: 903308e
created_at: 2026-05-30T12:51:26+09:00
superseded_by: plgg-dist-rebuild-required-after-core
last_seen: 2026-05-30T12:51:26+09:00
first_seen: 2026-05-30T12:51:26+09:00
concern_id: plgg-dist-rebuild-required-after-core
severity: moderate
status: superseded
resolved_by_pr: 
resolved_by_commit: 
---

# plgg dist rebuild required after core changes (carried from PR #31)

## Description

Every package consumes plgg core via a symlink resolving to `dist/` (never committed). After any core change, `dist/` must be rebuilt or dependent tsc/vitest reports "module has no exported member" for valid source — no workspace or pretest-rebuild automation exists.

## How to Fix

Add a pretest hook that rebuilds plgg in dependent packages, or adopt npm workspaces; at minimum, keep the rebuild step in ticket templates.
