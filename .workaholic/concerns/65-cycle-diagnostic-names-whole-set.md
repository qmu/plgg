---
type: Concern
origin_pr: 65
origin_pr_url: https://github.com/qmu/plgg/pull/65
origin_branch: work-20260712-003839
origin_commit: 1696ae90
created_at: 2026-07-12T11:39:12+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# Circular-derivation diagnostics name the whole unresolvable set

## Description

Kahn layering reports every derived field that never becomes ready — cycle members and anything downstream — as "part of (or depends on) a derivation cycle" rather than isolating the minimal cycle (see [c2d1461f](https://github.com/qmu/plgg/commit/c2d1461f) in `packages/plgg-ir-manifest/src/domain/usecase/verifyDependencies.ts`).

## How to Fix

If minimal-cycle reporting proves valuable for LLM correction loops, add an SCC pass (Tarjan) over the derived-field graph to separate cycle members from dependents.
