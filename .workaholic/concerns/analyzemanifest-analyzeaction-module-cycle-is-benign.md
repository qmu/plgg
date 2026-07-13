---
type: Concern
origin_pr: 65
origin_pr_url: https://github.com/qmu/plgg/pull/65
origin_branch: work-20260712-003839
origin_commit: 1696ae90
created_at: 2026-07-12T11:39:12+09:00
last_seen: 2026-07-12T11:39:12+09:00
first_seen: 2026-07-12T11:39:12+09:00
concern_id: analyzemanifest-analyzeaction-module-cycle-is-benign
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# analyzeManifest ↔ analyzeAction module cycle is benign but fragile

## Description

`analyzeAction` imports `analyzeInputFields` from `analyzeManifest`, which imports `parseAction` back. All references are inside function bodies so ESM/bundler evaluation is safe today, but a future top-level use of either import would break at load time (see [8f3c63d1](https://github.com/qmu/plgg/commit/8f3c63d1)).

## How to Fix

Extract the shared field-building machinery (parseFieldDecl, analyzeInputFields, validation parsing) into its own module both can import.
