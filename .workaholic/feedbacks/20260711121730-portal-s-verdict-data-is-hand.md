---
type: Feedback
title: Portal's verdict data is hand-edited typed data
kind: concern
source: development
created_at: 2026-07-11T12:17:30+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: portal-s-verdict-data-is-hand
owner: 
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711035317-plggpress-poc-portal-and-plan.md, 20260711035318-poc1-browser-search-core.md]
origin_pr: 62
origin_pr_url: https://github.com/qmu/plgg/pull/62
origin_branch: work-20260711-035119
origin_commit: c95e8028
last_seen: 2026-07-16T15:27:33+09:00
---

# Portal's verdict data is hand-edited typed data

## Description

The portal's `pocs.ts` verdict data is maintained by hand (status + verdict flipped per concluding ticket) rather than derived mechanically. This branch again hand-edited it (PoC 5/6 verdicts, poc4c removal) with the `pocConsistent` gate holding throughout, but the hand-edited-data risk persists (see [34be6698](https://github.com/qmu/plgg/commit/34be6698) in `packages/plgg-poc-portal/src/pocs.ts`).

## How to Fix

Keep `pocConsistent` mandatory on every verdict change; with the fleet now fully concluded, the integration phase can close this by deriving portal state mechanically or by freezing the data.
