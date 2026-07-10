---
origin_pr: 51
origin_pr_url: https://github.com/qmu/plgg/pull/51
origin_branch: work-20260701-185044
origin_commit: efd21c0
created_at: 2026-07-03T02:00:50+09:00
severity: low
status: resolved
resolved_by_pr: f3bb180a
resolved_by_commit: 
---

# plggpress exports map is import-only (not require()-compatible)

## Description

plggpress keeps an import-only exports map; nothing requires it today, but a future require(plggpress) would fail the same way plggmatic did before adding types+default exports (see [21af849](https://github.com/qmu/plgg/commit/21af849))

## How to Fix

Widen plggpress's exports map to include types+default alongside the import condition, matching plggmatic's pattern
