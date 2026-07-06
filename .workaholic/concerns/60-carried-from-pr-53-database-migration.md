---
type: Concern
origin_pr: 60
origin_pr_url: https://github.com/qmu/plgg/pull/60
origin_branch: work-20260704-130317
origin_commit: 416da301
created_at: 2026-07-06T11:33:41+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #53) Database migration `down --to` silent degrade

## Description

plgg-db-migration's `down --to` silently degrades if the path is not found. No error is raised.

## How to Fix

Document the behavior or add explicit error handling (post-roadmap).
