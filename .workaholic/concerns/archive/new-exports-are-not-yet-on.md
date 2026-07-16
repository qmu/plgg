---
type: Concern
concern_id: new-exports-are-not-yet-on
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
status: resolved
resolved_by_pr:
resolved_by_commit:
closed_reason: plgg-ir-language@0.0.2 and plgg-ir-manifest@0.0.2 published and scratch-verified on 2026-07-16; the plggmatic consumer can import the compose seam from the registry
closed_at: 2026-07-16T17:33:58+09:00
---

# New exports are not yet on npm

## Description

`manifestDialect`, `mapDialect`, and `contextOf` exist only in the repo — both packages sit at 0.0.1 on the registry and this branch bumps no version, so the plggmatic consumer cannot import them from the published package yet (see [a16cc0a2](https://github.com/qmu/plgg/commit/a16cc0a2)).

## How to Fix

Bump plgg-ir-language and plgg-ir-manifest and publish via `publish-npm.sh` when plggmatic is ready to integrate the compose seam.
