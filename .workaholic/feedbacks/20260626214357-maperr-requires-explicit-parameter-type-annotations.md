---
type: Feedback
title: (carried from PR #31) mapErr requires explicit parameter type annotations
kind: concern
source: development
created_at: 2026-06-26T21:43:57+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: maperr-requires-explicit-parameter-type-annotations
owner: 
mission: 
tickets: []
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
last_seen: 2026-06-26T21:43:57+09:00
closed: superseded
---

# (carried from PR #31) mapErr requires explicit parameter type annotations

## Description

The `mapErr` inference limitation in `Disjunctives/Result.ts` is untouched by a vitest→plgg-test migration.

## How to Fix

Add explicit type annotations to `mapErr` call sites or introduce a type-inference helper to reduce boilerplate and improve ergonomics.
