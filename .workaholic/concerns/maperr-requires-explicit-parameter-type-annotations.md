---
origin_pr: 31
origin_pr_url: https://github.com/qmu/plgg/pull/31
origin_branch: work-20260513-182057
origin_commit: 71f411f
created_at: 2026-05-27T13:39:04+09:00
last_seen: 2026-06-26T21:43:57+09:00
first_seen: 2026-05-27T13:39:04+09:00
concern_id: maperr-requires-explicit-parameter-type-annotations
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# `mapErr` requires explicit parameter type annotations

## Description

The `mapErr` combinator's callback parameter cannot be inferred from the pipe position because the callback type depends on the `Result`'s error channel, which is not known until the curried function is applied. This forces every `mapErr((e: InvalidError) => ...)` call to annotate the error type explicitly (see [5045f36](https://github.com/qmu/plgg/commit/5045f36) in `src/plgg/src/Disjunctives/Result.ts`).

## How to Fix

Document this near the `mapErr` export; expect reviewers to flag unannotated lambdas in code review.
