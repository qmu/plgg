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

# (carried from PR #40) tsc-plgg.sh only type-checks the core plgg package

## Description

`scripts/tsc-plgg.sh` still only runs `npm run tsc` in `packages/plgg`; the migration did not broaden the typecheck gate to all packages.

## How to Fix

Extend `tsc-plgg.sh` to typecheck all packages in dependency order, or create a separate `tsc-all.sh` gate that CI enforces.
