---
origin_pr: 37
origin_pr_url: https://github.com/qmu/plgg/pull/37
origin_branch: work-20260528-143038
origin_commit: 903308e
created_at: 2026-05-30T12:51:26+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# Match type-level gaps remain open (carried from PR #31)

## Description

`packages/plgg/docs/match-type-completeness.md` still lists Gaps 1–7 as open (duplicate atomic patterns, non-final `otherwise`, mixed pattern families, foreign discriminant tags, heterogeneous returns) — each compiles today but represents either a false negative or over-restriction.

## How to Fix

Sequence follow-up tickets by invasiveness; prioritize false-negative (unsound) gaps first, pinning each fix with `match.completeness.spec.ts`.
