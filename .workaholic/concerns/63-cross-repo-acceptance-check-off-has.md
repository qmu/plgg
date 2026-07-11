---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711131543-resume-poc-fleet-ci-fix-and-next-tickets.md, 20260711162512-record-poc1-verdict.md, 20260711170040-poc1-cjk-tokenizer-measured.md]
origin_pr: 63
origin_pr_url: https://github.com/qmu/plgg/pull/63
origin_branch: work-20260711-125441
origin_commit: d20470d3
created_at: 2026-07-12T00:34:48+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# Cross-repo acceptance check-off has no automated seam

## Description

The ai-native-ui mission's two remaining acceptance items are delegated to the screen-structure mission now living in qmu/plggmatic; no workflow seam records cross-repo completion, so checking them off depends on a manual changelog line here when the plggmatic-side work lands (see [b7b51e75](https://github.com/qmu/plgg/commit/b7b51e75) in `.workaholic/missions/plggmatic-ai-native-ui-toward-a-dsl/mission.md`).

## How to Fix

Adopt a documented check-off ceremony: when the qmu/plggmatic mission delivers its DSL v1 or WebMCP prototype, append the cross-repo changelog line and tick the delegated items in the same session.
