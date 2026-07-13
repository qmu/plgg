---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711131543-resume-poc-fleet-ci-fix-and-next-tickets.md, 20260711162512-record-poc1-verdict.md, 20260711170040-poc1-cjk-tokenizer-measured.md]
origin_pr: 63
origin_pr_url: https://github.com/qmu/plgg/pull/63
origin_branch: work-20260711-125441
origin_commit: d20470d3
created_at: 2026-07-12T00:34:48+09:00
last_seen: 2026-07-12T00:34:48+09:00
first_seen: 2026-07-12T00:34:48+09:00
concern_id: pre-existing-poc-source-not-fully
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# Pre-existing PoC source not fully prettier-50-clean

## Description

Both PoC packages' pre-existing source predates their new `.prettierrc.json` and is not fully printWidth-50 clean; the one-time format pass was deferred because prettier was resource-starved by a concurrent session, and neither the gap nor its absence from CI is gated (see [48e9a7bf](https://github.com/qmu/plgg/commit/48e9a7bf) in `packages/plgg-poc1-search`, `packages/plgg-poc-portal`).

## How to Fix

Run a one-time `prettier --write` over both packages' existing `src/` when host resources allow, and consider a `prettier --check` in the package test gates.
