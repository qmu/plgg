---
type: Concern
origin_pr: 52
origin_pr_url: https://github.com/qmu/plgg/pull/52
origin_branch: work-20260703-020116
origin_commit: e859e23
created_at: 2026-07-03T04:11:11+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# Deploy Guide's hard-coded build list is a second copy of the dependency topology

## Description

The workflow list must be hand-maintained in dependency order; any future package.json dep change can break CI while every local gate stays green, and only the post-merge clean runner reveals it (see [b8c2986](https://github.com/qmu/plgg/commit/b8c2986) in `.github/workflows/deploy-guide.yml`)

## How to Fix

Derive the build order from package.json topology in one canonical runner (per the command-scripts policy) used by both check-all.sh and the workflow
