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

# (carried from PR #51) proc error channel adopted only in plgg-db-migration

## Description

The proc Defect error channel (for domain-layer type errors) was implemented for database migrations but not adopted in other domain layers (HTTP, routing, etc.)

## How to Fix

Extend proc error channels to HTTP and routing error types; deferred
