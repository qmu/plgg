---
type: Feedback
title: Match type-level gaps remain open (carried from PR #31)
kind: concern
source: development
created_at: 2026-05-30T12:51:26+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: match-type-level-gaps-remain-open
owner: 
mission: 
tickets: []
origin_pr: 37
origin_pr_url: https://github.com/qmu/plgg/pull/37
origin_branch: work-20260528-143038
origin_commit: 903308e
last_seen: 2026-05-30T12:51:26+09:00
closed: superseded
---

# Match type-level gaps remain open (carried from PR #31)

## Description

`packages/plgg/docs/match-type-completeness.md` still lists Gaps 1–7 as open (duplicate atomic patterns, non-final `otherwise`, mixed pattern families, foreign discriminant tags, heterogeneous returns) — each compiles today but represents either a false negative or over-restriction.

## How to Fix

Sequence follow-up tickets by invasiveness; prioritize false-negative (unsound) gaps first, pinning each fix with `match.completeness.spec.ts`.
