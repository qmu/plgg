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
concern_id: dsl-division-of-labor-between-plgg
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# DSL division of labor between plgg-ir and the screen-structure mission

## Description

The new plgg-ir mission and the migrated screen-structure mission (qmu/plggmatic) both describe a restricted Lisp for the plgg ecosystem. The recorded division — plgg-ir owns the generic language toolchain, screen-structure owns plggmatic's dialect and runtime semantics — has not yet been tested by an actual ticket on either side (see [d77c26c9](https://github.com/qmu/plgg/commit/d77c26c9) in `.workaholic/missions/build-the-plgg-ir-package-family/mission.md`).

## How to Fix

When the first plgg-ir ticket and the screen-structure DSL-v1 ticket are cut, explicitly partition which forms, reader, and checker live in plgg-ir versus what stays plggmatic-side, and annotate both missions with the outcome.
