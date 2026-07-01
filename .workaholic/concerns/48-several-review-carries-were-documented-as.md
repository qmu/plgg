---
origin_pr: 48
origin_pr_url: https://github.com/qmu/plgg/pull/48
origin_branch: work-20260627-205005
origin_commit: 80b301f
created_at: 2026-06-28T01:22:01+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# Several review carries were documented as v1 limitations rather than code-fixed

## Description

to finish the last ticket quickly, three small review carries were written into the README's "Limitations (v1)" instead of folded into code (see [53319cf](https://github.com/qmu/plgg/commit/53319cf) in `packages/plgg-db-migration/README.md`): `newMigration` does not sanitize path separators in `<name>`; `down --to` with the value omitted silently degrades to roll-back-last; `listApplied` collapses a decode failure to `LedgerCorrupt` with `cause:None` (drops the underlying `InvalidError` detail).

## How to Fix

fold each — reject path separators in `newMigration`; error on a `--to` flag with no value; pass the decode `InvalidError` as the `LedgerCorrupt` cause.
