---
type: Concern
origin_pr: 53
origin_pr_url: https://github.com/qmu/plgg/pull/53
origin_branch: work-20260703-050355
origin_commit: 0ddb00d
created_at: 2026-07-03T17:31:14+09:00
severity: low
status: resolved
resolved_by_pr: 540d2f36
resolved_by_commit: 
---

# (carried from PR #51) Facade barrel names shadow plgg-server vocabulary

## Description

plggmatic's root barrel exports 'Facade' which conflicts with plgg-server's Facade class; consumers must disambiguate

## How to Fix

Rename plggmatic's barrel export to 'Plggmatic' or namespace it; deferred
