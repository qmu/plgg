---
origin_pr: 31
origin_pr_url: https://github.com/qmu/plgg/pull/31
origin_branch: work-20260513-182057
origin_commit: 71f411f
created_at: 2026-05-27T13:39:04+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# Match type-level gaps remain open for future fixes

## Description

The gap analysis (`src/plgg/docs/match-type-completeness.md`) identified 8 type-level issues across `match`; this branch shipped fixes for two (handler narrowing and atomic/array-content coverage). Remaining gaps include duplicate atomic patterns, non-final `otherwise` placement, mixed pattern families, foreign discriminant tags, and heterogeneous return types — all of which currently compile but represent either unsoundness (false negatives) or over-restriction (see [394f186](https://github.com/qmu/plgg/commit/394f186) in `src/plgg/docs/match-type-completeness.md`).

## How to Fix

Sequence follow-up tickets by invasiveness and value; prioritize false-negative gaps before false positives. Use `match.completeness.spec.ts` to pin each fix's scope and prevent regressions.
