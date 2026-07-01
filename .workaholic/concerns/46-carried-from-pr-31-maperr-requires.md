---
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
created_at: 2026-06-26T21:43:57+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #31) mapErr requires explicit parameter type annotations

## Description

The `mapErr` inference limitation in `Disjunctives/Result.ts` is untouched by a vitest→plgg-test migration.

## How to Fix

Add explicit type annotations to `mapErr` call sites or introduce a type-inference helper to reduce boilerplate and improve ergonomics.
