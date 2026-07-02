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

# (carried from PR #47) Published library bundles are unminified and unshaken

## Description

emitBundle.ts was not changed; no minify/tree-shake pass was added

## How to Fix

Add optional minification and tree-shaking to emitBundle.ts for production dist; keep dev builds unminified for debugging
