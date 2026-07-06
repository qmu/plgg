---
type: Concern
origin_pr: 60
origin_pr_url: https://github.com/qmu/plgg/pull/60
origin_branch: work-20260704-130317
origin_commit: 416da301
created_at: 2026-07-06T11:33:41+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #59) Attempt combinator intentionally omitted

## Description

plgg-parser's design decision: stateless-failure backtracking makes an `attempt` combinator a no-op, so it was deliberately omitted. No fix intended.

## How to Fix

Document the rationale so a future reader does not re-propose the combinator.
