---
origin_pr: 41
origin_pr_url: https://github.com/qmu/plgg/pull/41
origin_branch: work-20260617-002003
origin_commit: 8351741
created_at: 2026-06-17T21:31:52+09:00
last_seen: 2026-06-26T21:43:57+09:00
first_seen: 2026-06-17T21:31:52+09:00
concern_id: defect-is-invisible-in-precise-downstream
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# Defect is invisible in precise downstream error channels

## Description

`proc` now injects `Defect` into every chain's inferred error union, but precise downstream channels (e.g. `plgg-sql` returning `SqlError`, handlers annotated `HttpError`) do not surface `| Defect`, so an unexpected throw is carried at runtime under a type that claims to exclude it (see [c9ecc6e](https://github.com/qmu/plgg/commit/c9ecc6e) in `packages/plgg/src/Flowables/proc.ts`).

## How to Fix

Decide and encode the reconciliation: either each boundary maps `Defect` into its domain error via a `recoverDefect`/normalizer step, or the handler types must include `| Defect`. Make the bottom error visible in the types that claim to be precise.
