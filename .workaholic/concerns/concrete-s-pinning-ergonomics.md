---
type: Concern
origin_pr: 60
origin_pr_url: https://github.com/qmu/plgg/pull/60
origin_branch: work-20260704-130317
origin_commit: 416da301
created_at: 2026-07-06T11:33:41+09:00
last_seen: 2026-07-06T11:33:41+09:00
first_seen: 2026-07-06T11:33:41+09:00
concern_id: concrete-s-pinning-ergonomics
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# (carried from PR #59) Concrete-S pinning ergonomics

## Description

plgg-parser's concrete-S pinning has a sharp edge. No `specialize<S>()` helper or README idiom section exists.

## How to Fix

Add documentation and a helper combinator if pinning becomes tedious.
