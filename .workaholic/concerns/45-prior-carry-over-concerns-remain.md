---
origin_pr: 48
origin_pr_url: https://github.com/qmu/plgg/pull/48
origin_branch: work-20260627-205005
origin_commit: 80b301f
created_at: 2026-06-28T01:22:01+09:00
last_seen: 2026-06-28T01:22:01+09:00
first_seen: 2026-06-28T01:22:01+09:00
concern_id: 45-prior-carry-over-concerns-remain
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# 45 prior carry-over concerns remain active (unrelated to this branch)

## Description

the `.workaholic/concerns/` corpus (PRs 31/37/40/41/46/47 — HTTP/router/`match`/renderer/SSG/versioning/`tsc-plgg.sh`-scope/bundler items) was judged all **still_active**: this branch is a new isolated package plus a tiny additive plgg-sql seam and touches none of those domains. They are preserved in `.workaholic/concerns/` as the ledger, not reproduced here.

## How to Fix

address in domain-specific future branches; the persistent ones (monorepo versioning policy, `tsc-plgg.sh` checking only `packages/plgg`) remain the most actionable.
