---
type: Concern
origin_pr: 59
origin_pr_url: https://github.com/qmu/plgg/pull/59
origin_branch: work-20260704-015006
origin_commit: 1de1709
created_at: 2026-07-04T11:02:58+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# ~74 standing deferred concerns carried (PRs #31–#53)

## Description

The long-standing carry-over concern set (binary-request parallel `bytes` field, `mapErr`/`match` type-level gaps, route 404/405 dispatch, TEA effects/hydration, renderer runtime primitives + motion QA, plgg-db-migration rollback/race issues, unminified bundles, plgg-bundle execute-to-discover exports, dependabot grouping/actions ecosystem, plggpress import-only exports, HttpStatus refinement, proc error-channel adoption, and the operational CNAME/cert window) remains active and untouched by this branch. This PR is purely additive (new `plgg-parser` package) plus one revertible tokenizer swap in `plgg-highlight`; it neither resolves nor aggravates any of them.

## How to Fix

No action for this branch. Each carried concern retains its own file and follow-up path; they continue to roll forward until individually addressed.
