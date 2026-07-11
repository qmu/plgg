---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711035317-plggpress-poc-portal-and-plan.md, 20260711035318-poc1-browser-search-core.md]
origin_pr: 62
origin_pr_url: https://github.com/qmu/plgg/pull/62
origin_branch: work-20260711-035119
origin_commit: c95e8028
created_at: 2026-07-11T12:17:30+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# Portal's verdict data is hand-edited typed data

## Description

The PoC portal's fleet record (`packages/plgg-poc-portal/src/pocs.ts`) is hand-edited typed data rather than derived from anything automatic; its own smoke specs enforce invariants like unique ports and the `pocConsistent` verdict rule, but every future PoC ticket must remember to update this file as its final step to keep the mission's confidence-collection index accurate ([c6dede31](https://github.com/qmu/plgg/commit/c6dede31), `packages/plgg-poc-portal/src/pocs.ts`).

## How to Fix

Keep treating the `pocConsistent` smoke check as a required gate on every future PoC ticket's Final Report step, since it is the only mechanical safeguard against the record silently drifting from reality as the fleet grows to six-plus entries.
