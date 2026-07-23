---
origin_pr: 49
origin_pr_url: https://github.com/qmu/plgg/pull/49
origin_branch: work-20260628-010653
origin_commit: f06fbba
created_at: 2026-06-29T11:27:59+09:00
last_seen: 2026-06-29T11:27:59+09:00
first_seen: 2026-06-29T11:27:59+09:00
concern_id: 45-long-standing-carry-over-concerns
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# 45 long-standing carry-over concerns (carried from PRs #31, #37, #40, #41, #46, #47)

## Description

This branch touched only Config (removed devDeps, added `.github/dependabot.yml`) and did not modify runtime code, the build pipeline, the type system, or the renderer, so none of the pre-existing carry-overs were resolved. They remain untouched, grouped by theme: (1) type-system gaps (match type-level exhaustiveness, `mapErr` parameter-type annotations); (2) HTTP body types (`Uint8Array` ↔ `BodyInit` assignability); (3) router compilation trade-offs (404/405 selection); (4) renderer/TEA runtime (effects hydration, runtime primitives, motion verification); (5) build pipeline (dist rebuild atomicity, `tsc-plgg.sh` scope); (6) plgg-server/plgg-fetch vendoring surface; (7) error boundaries (defect visibility, shared error primitive); (8) workaholic specs/infrastructure doc-count drift. See `.workaholic/concerns/` for the full set.

## How to Fix

Track them in the backlog without blocking this minimal Config-only change; prioritize by impact/effort when type-system and renderer work is next scheduled.
