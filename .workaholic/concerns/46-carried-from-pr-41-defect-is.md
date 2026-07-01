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

# (carried from PR #41) Defect is invisible in precise downstream reconciliation

## Description

`proc`'s Defect injection and downstream error-channel reconciliation are core-type concerns untouched by the test migration.

## How to Fix

Design and implement a transparent error-injection and recovery protocol for `proc`; document the Defect semantics and error-channel guarantees.
