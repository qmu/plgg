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

# (carried from PR #52) HTTPS enforcement and proxied mode follow GitHub's re-enable

## Description

Post-ship operational step: re-enable `https_enforced` via `gh api` after GitHub issues the cert. Not exercised by this branch (it is an ops action, not code).

## How to Fix

Execute post-merge as an operator workflow.
