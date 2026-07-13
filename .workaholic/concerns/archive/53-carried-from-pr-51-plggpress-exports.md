---
type: Concern
origin_pr: 53
origin_pr_url: https://github.com/qmu/plgg/pull/53
origin_branch: work-20260703-050355
origin_commit: 0ddb00d
created_at: 2026-07-03T17:31:14+09:00
last_seen: 2026-07-03T17:31:14+09:00
first_seen: 2026-07-03T17:31:14+09:00
concern_id: plggpress-exports-map-is-import-only
severity: low
status: resolved
resolved_by_pr: f3bb180a
resolved_by_commit: 
---

# (carried from PR #51) plggpress exports map is import-only

## Description

plggpress's package.json exports map uses only import conditions; require() paths are not defined

## How to Fix

Widen the exports map to provide require-compatible CJS paths (or accept that plggpress is ESM-only for CommonJS consumers)
