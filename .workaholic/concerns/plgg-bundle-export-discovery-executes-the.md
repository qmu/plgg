---
type: Concern
origin_pr: 53
origin_pr_url: https://github.com/qmu/plgg/pull/53
origin_branch: work-20260703-050355
origin_commit: 0ddb00d
created_at: 2026-07-03T17:31:14+09:00
last_seen: 2026-07-03T17:31:14+09:00
first_seen: 2026-07-03T17:31:14+09:00
concern_id: plgg-bundle-export-discovery-executes-the
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# (carried from PR #47) plgg-bundle export discovery executes the built bundle as a side effect

## Description

runner.ts discovers the export surface by running the built bundle; any side effects in initialization will execute during the build

## How to Fix

Build a static export analyzer (import-the-tree or read TypeScript symbols) that doesn't require execution; deferred
