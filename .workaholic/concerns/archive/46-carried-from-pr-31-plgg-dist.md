---
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
created_at: 2026-06-26T21:43:57+09:00
superseded_by: plgg-dist-rebuild-required-after-core
last_seen: 2026-06-26T21:43:57+09:00
first_seen: 2026-06-26T21:43:57+09:00
concern_id: plgg-dist-rebuild-required-after-core
severity: moderate
status: superseded
resolved_by_pr: 
resolved_by_commit: 
---

# (carried from PR #31) plgg dist rebuild required after core changes

## Description

Packages still consume plgg core via dist symlinks; no workspace/pretest-rebuild automation was added by the migration.

## How to Fix

Implement workspace-aware pretest rebuild automation so dependent packages always test against fresh core artifacts without manual steps.
