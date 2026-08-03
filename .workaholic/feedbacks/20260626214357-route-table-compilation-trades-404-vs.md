---
type: Feedback
title: (carried from PR #31) route table compilation trades 404 vs 405
kind: concern
source: development
created_at: 2026-06-26T21:43:57+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: route-table-compilation-trades-404-vs
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

# (carried from PR #31) route table compilation trades 404 vs 405

## Description

The routing dispatch 404/405 trade-off is a documented design decision untouched by the test migration.

## How to Fix

This is a documented design trade-off; monitor real-world usage to confirm the choice is optimal, or revisit if HTTP semantics require both codes.
