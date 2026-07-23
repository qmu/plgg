---
origin_pr: 31
origin_pr_url: https://github.com/qmu/plgg/pull/31
origin_branch: work-20260513-182057
origin_commit: 71f411f
created_at: 2026-05-27T13:39:04+09:00
last_seen: 2026-06-26T21:43:57+09:00
first_seen: 2026-05-27T13:39:04+09:00
concern_id: plgg-dist-rebuild-required-after-core
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# plgg dist rebuild required after core changes

## Description

plgg-web consumes plgg core via a symlink that resolves to `dist/` (never committed). After any change to plgg core (e.g., adding `mapErr`, `decodeJson`), `dist/` must be rebuilt with `npm run build` in `src/plgg`, or plgg-web's tsc/vitest reports "module has no exported member" for valid source (see [5045f36](https://github.com/qmu/plgg/commit/5045f36) in `src/plgg/package.json`).

## How to Fix

Add a pretest hook in plgg-web that rebuilds plgg, or document the rebuild step in the ticket template for plgg-core changes; consider a CI check that rebuilds plgg before running plgg-web tests.
