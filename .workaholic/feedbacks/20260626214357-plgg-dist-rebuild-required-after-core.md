---
type: Feedback
title: (carried from PR #31) plgg dist rebuild required after core changes
kind: concern
source: development
created_at: 2026-06-26T21:43:57+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: plgg-dist-rebuild-required-after-core
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

# (carried from PR #31) plgg dist rebuild required after core changes

## Description

Packages still consume plgg core via dist symlinks; no workspace/pretest-rebuild automation was added by the migration.

## How to Fix

Implement workspace-aware pretest rebuild automation so dependent packages always test against fresh core artifacts without manual steps.
