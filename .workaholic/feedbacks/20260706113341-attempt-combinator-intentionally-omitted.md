---
type: Feedback
title: (carried from PR #59) Attempt combinator intentionally omitted
kind: concern
source: development
created_at: 2026-07-06T11:33:41+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: attempt-combinator-intentionally-omitted
owner: 
mission: 
tickets: []
origin_pr: 60
origin_pr_url: https://github.com/qmu/plgg/pull/60
origin_branch: work-20260704-130317
origin_commit: 416da301
last_seen: 2026-07-06T11:33:41+09:00
closed: superseded
---

# (carried from PR #59) Attempt combinator intentionally omitted

## Description

plgg-parser's design decision: stateless-failure backtracking makes an `attempt` combinator a no-op, so it was deliberately omitted. No fix intended.

## How to Fix

Document the rationale so a future reader does not re-propose the combinator.
