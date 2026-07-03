---
type: Concern
origin_pr: 53
origin_pr_url: https://github.com/qmu/plgg/pull/53
origin_branch: work-20260703-050355
origin_commit: 0ddb00d
created_at: 2026-07-03T17:31:14+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #41) plgg-db-migration issues: --to degrade flag, listApplied cause evaluation, and cross-process race on migrateTenant

## Description

The migration library carries three review carries: gradual degradation during rollback (--to not checked), listApplied doesn't report causation, and migrateTenant has a race window between lock acquire and process registration

## How to Fix

Implement gradual degradation, add causation reporting, and add process-registry handoff; carry as a post-ship migration audit
