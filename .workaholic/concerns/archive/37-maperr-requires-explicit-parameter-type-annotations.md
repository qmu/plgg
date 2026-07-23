---
origin_pr: 37
origin_pr_url: https://github.com/qmu/plgg/pull/37
origin_branch: work-20260528-143038
origin_commit: 903308e
created_at: 2026-05-30T12:51:26+09:00
superseded_by: maperr-requires-explicit-parameter-type-annotations
last_seen: 2026-05-30T12:51:26+09:00
first_seen: 2026-05-30T12:51:26+09:00
concern_id: maperr-requires-explicit-parameter-type-annotations
severity: moderate
status: superseded
resolved_by_pr: 
resolved_by_commit: 
---

# `mapErr` requires explicit parameter type annotations (carried from PR #31)

## Description

`mapErr`'s callback parameter can't be inferred from the pipe position (the error channel isn't known until the curried function is applied), forcing every `mapErr((e: InvalidError) => …)` call site to annotate the error type (see `packages/plgg/src/Disjunctives/Result.ts`).

## How to Fix

Document the inference limitation near the `mapErr` export and expect reviewers to flag unannotated lambdas.
