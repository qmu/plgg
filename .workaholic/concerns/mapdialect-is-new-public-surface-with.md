---
type: Concern
concern_id: mapdialect-is-new-public-surface-with
mission: [plggmatic-ai-native-ui-toward-a-dsl]
tickets: [20260716103109-export-the-domain-vocabulary-as-a-composable-dialect.md, 20260716112612-resume-decide-the-domain-dialect-shape.md]
origin_pr: 74
origin_pr_url: https://github.com/qmu/plgg/pull/74
origin_branch: work-20260716-115204
origin_commit: 78185894
created_at: 2026-07-16T15:41:15+09:00
first_seen: 2026-07-16T15:41:15+09:00
last_seen: 2026-07-16T15:41:15+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# mapDialect is new public surface with closed-interior semantics

## Description

`mapDialect` is now part of plgg-ir-language's public API, and its semantics are a commitment: a mapped form analyzes with its OWN dialect's closed vocabulary while the composition's scope (and with it cross-dialect references) flows through; consumer dialects add forms only, never extend a domain type (see [a16cc0a2](https://github.com/qmu/plgg/commit/a16cc0a2) in `packages/plgg-ir-language/src/domain/usecase/mapDialect.ts`).

## How to Fix

Uphold the closed-interior design in future forms machinery (any new `AnalysisContext` member must keep the mapped rebuild honest), and carry the forms-only bound into consumer-facing guides when plggmatic integrates.
