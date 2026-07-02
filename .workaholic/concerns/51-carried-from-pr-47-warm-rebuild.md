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

# (carried from PR #47) Warm rebuild dist swap has a microsecond absence window

## Description

build.ts warm-rebuild two-rename dance was not changed; the microsecond absence window remains

## How to Fix

Implement an atomic dist publish (single rename) to eliminate the brief visibility window
