---
type: Feedback
title: (carried from PR #40) tsc-plgg.sh only type-checks the core plgg package
kind: concern
source: development
created_at: 2026-06-26T21:43:57+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: tsc-plgg-sh-only-type-checks
owner: 
mission: 
tickets: []
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
last_seen: 2026-06-26T21:43:57+09:00
closed: resolved
resolved_by_pr: 1ce90e0
---

# (carried from PR #40) tsc-plgg.sh only type-checks the core plgg package

## Description

`scripts/tsc-plgg.sh` still only runs `npm run tsc` in `packages/plgg`; the migration did not broaden the typecheck gate to all packages.

## How to Fix

Extend `tsc-plgg.sh` to typecheck all packages in dependency order, or create a separate `tsc-all.sh` gate that CI enforces.
