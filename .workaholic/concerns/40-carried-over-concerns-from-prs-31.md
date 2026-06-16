---
origin_pr: 40
origin_pr_url: https://github.com/qmu/plgg/pull/40
origin_branch: work-20260531-003055
origin_commit: 470506e
created_at: 2026-06-16T14:44:46+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# Carried-over concerns from PRs #31 / #37 remain active

## Description

14 carry-overs (deduped: binary-request parallel path, `mapErr` param-type annotations, match type-level gaps, route-table 404/405 trade-off, `Uint8Array`→`BodyInit`, the dist-rebuild requirement, TEA-has-no-effects, infrastructure spec count drift) target the HTTP/router/match core and the effects gap — areas this branch did not remediate.

## How to Fix

Re-judge them on the next branch that touches those areas; the effects-related ones (`tea-minimum-has-no-effects-hydration`, `plgg-dist-rebuild`) now have design direction from the research spikes and the concerns above.
