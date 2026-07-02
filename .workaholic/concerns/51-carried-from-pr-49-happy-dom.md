---
origin_pr: 51
origin_pr_url: https://github.com/qmu/plgg/pull/51
origin_branch: work-20260701-185044
origin_commit: efd21c0
created_at: 2026-07-03T02:00:50+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #49) happy-dom removal requires per-package dependency-scoping CI gate

## Description

No per-package dependency-scoping CI gate was added; the guidance remains a standing note

## How to Fix

Implement a dependency-audit CI step to prevent unintended dependencies per package
