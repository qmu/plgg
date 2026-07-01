---
origin_pr: 47
origin_pr_url: https://github.com/qmu/plgg/pull/47
origin_branch: work-20260626-221353
origin_commit: 3adc809
created_at: 2026-06-27T19:52:31+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# ~40 long-standing carry-over concerns remain active (unrelated to this branch)

## Description

the carry-over judge assessed the full `.workaholic/concerns/` corpus (PRs 31/37/40/41/46 — HTTP/router/`match`/renderer/SSG/error-model/versioning/`tsc-plgg.sh`-scope items) and found all **still_active**: this build-tooling-only branch touches none of those domains. They are preserved verbatim in `.workaholic/concerns/` as the institutional ledger, not reproduced here to avoid burying this branch's own concerns.

## How to Fix

address in domain-specific future branches; the persistent ones (monorepo versioning policy, `tsc-plgg.sh` checking only `packages/plgg`, dist-rebuild automation, `infrastructure.md` count drift) are the most actionable.
