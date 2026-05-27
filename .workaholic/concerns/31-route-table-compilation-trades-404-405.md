---
origin_pr: 31
origin_pr_url: https://github.com/qmu/plgg/pull/31
origin_branch: work-20260513-182057
origin_commit: 71f411f
created_at: 2026-05-27T13:39:04+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# Route table compilation trades 404/405 speed for `Allow` ordering fidelity

## Description

The compiled route table uses a per-method map for fast lookups, which cannot reproduce route-registration order for the `Allow` header on a 405. To preserve byte-for-byte equivalence, the error path deliberately falls back to the original linear scan (see [cda70c3](https://github.com/qmu/plgg/commit/cda70c3) in `src/plgg-web/src/Routing/usecase/dispatch.ts`).

## How to Fix

This is a documented trade-off, not a bug. If error-path performance ever matters, add a separate methods-per-path index decoupled from route order and document the behavioral change.
