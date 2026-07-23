---
origin_pr: 51
origin_pr_url: https://github.com/qmu/plgg/pull/51
origin_branch: work-20260701-185044
origin_commit: efd21c0
created_at: 2026-07-03T02:00:50+09:00
last_seen: 2026-07-03T17:31:14+09:00
first_seen: 2026-07-03T02:00:50+09:00
concern_id: proc-error-channel-adopted-only-in
severity: moderate
status: superseded
resolved_by_pr: 
resolved_by_commit: 
superseded_by: proc-s-defect-stays-invisible-and
---

# Proc error channel adopted only in plgg-db-migration

## Description

Ticket 211838 adopted option 2 (accept | Defect, fold at CLI edge) primarily in plgg-db-migration; remaining hand-rolled error handling elsewhere leaves the error channel inconsistent across the codebase (see [79dd708](https://github.com/qmu/plgg/commit/79dd708))

## How to Fix

Extend the proc-based error channel uniformly: convert remaining ladders to proc, folding Defect consistently at domain edges
