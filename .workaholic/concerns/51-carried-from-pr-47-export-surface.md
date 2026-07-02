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

# (carried from PR #47) Export surface discovered by executing the built bundle

## Description

plgg-bundle still discovers exports by executing the built bundle; [951f034](https://github.com/qmu/plgg/commit/951f034) only added a native-import fallback

## How to Fix

Implement a static export-surface analyzer that reads source-level export statements without executing bundle code
