---
type: Concern
origin_pr: 53
origin_pr_url: https://github.com/qmu/plgg/pull/53
origin_branch: work-20260703-050355
origin_commit: 0ddb00d
created_at: 2026-07-03T17:31:14+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #51) Hot reload does not refresh site.config.ts

## Description

The dev preview cannot hot-reload when site.config.ts changes (IA, home content); requires manual container restart

## How to Fix

Implement a dev-server watcher for site.config.ts that triggers a full rebuild; deferred (recorded exception)
