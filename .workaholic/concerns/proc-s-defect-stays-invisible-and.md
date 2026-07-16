---
type: Concern
concern_id: proc-s-defect-stays-invisible-and
mission: 
tickets: []
origin_pr: 41
origin_pr_url: https://github.com/qmu/plgg/pull/41
origin_branch: work-20260617-002003
origin_commit: 8351741
created_at: 2026-07-16T15:11:51+09:00
first_seen: 2026-06-17T21:31:52+09:00
last_seen: 2026-07-16T15:27:33+09:00
severity: urgent
status: active
compound: true
resolved_by_pr: 
resolved_by_commit: 
---

# proc's Defect stays invisible AND proc adoption is incomplete, so throws surface under types claiming to be precise

## Description

Two individually-moderate concerns compound into a type-soundness gap: (A) precise downstream error channels (SqlError, HttpError) omit `| Defect`, so an injected Defect is carried at runtime under a type that excludes it; (B) proc/Defect folding was adopted only in plgg-db-migration, leaving hand-rolled ladders elsewhere. Together, an unexpected throw in an un-migrated module surfaces under a precise error type with no uniform fold at the boundary (see `.workaholic/concerns/proc-s-defect-stays-invisible-and.md`).

## How to Fix

Audit module boundaries for proc adoption consistency; add `| Defect` to the precise downstream channels or fold uniformly at the boundary; migrate the remaining hand-rolled ladders.

