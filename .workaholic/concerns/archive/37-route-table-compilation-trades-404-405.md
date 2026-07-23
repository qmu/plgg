---
origin_pr: 37
origin_pr_url: https://github.com/qmu/plgg/pull/37
origin_branch: work-20260528-143038
origin_commit: 903308e
created_at: 2026-05-30T12:51:26+09:00
superseded_by: route-table-compilation-trades-404-405
last_seen: 2026-05-30T12:51:26+09:00
first_seen: 2026-05-30T12:51:26+09:00
concern_id: route-table-compilation-trades-404-405
severity: moderate
status: superseded
resolved_by_pr: 
resolved_by_commit: 
---

# Route table compilation trades 404/405 speed for `Allow` ordering fidelity (carried from PR #31)

## Description

`packages/plgg-server/src/Routing/usecase/dispatch.ts` uses a compiled per-method table for the success path but deliberately falls back to a linear registration-order scan on the 405/404 cold path to preserve `Allow` header ordering.

## How to Fix

If error-path performance ever matters, add a separate methods-per-path index decoupled from registration order and document the behavioral change.
