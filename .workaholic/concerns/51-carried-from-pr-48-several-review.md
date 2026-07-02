---
origin_pr: 51
origin_pr_url: https://github.com/qmu/plgg/pull/51
origin_branch: work-20260701-185044
origin_commit: efd21c0
created_at: 2026-07-03T02:00:50+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #48) Several review carries were documented as partially-addressed

## Description

Commit [8928d1d](https://github.com/qmu/plgg/commit/8928d1d) fixed only the newMigration path-separator sub-item; the down --to silent-degrade and listApplied LedgerCorrupt cause:None sub-items remain

## How to Fix

Complete the remaining plgg-db-migration sub-items: implement --to graceful degradation and fix listApplied's LedgerCorrupt cause attribution
