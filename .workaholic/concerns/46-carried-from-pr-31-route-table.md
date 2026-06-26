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

# (carried from PR #31) route table compilation trades 404 vs 405

## Description

The routing dispatch 404/405 trade-off is a documented design decision untouched by the test migration.

## How to Fix

This is a documented design trade-off; monitor real-world usage to confirm the choice is optimal, or revisit if HTTP semantics require both codes.
