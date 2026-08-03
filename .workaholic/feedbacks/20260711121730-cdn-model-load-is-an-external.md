---
type: Feedback
title: CDN model load is an external runtime dependency of the PoC page
kind: concern
source: development
created_at: 2026-07-11T12:17:30+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: cdn-model-load-is-an-external
owner: 
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711035317-plggpress-poc-portal-and-plan.md, 20260711035318-poc1-browser-search-core.md]
origin_pr: 62
origin_pr_url: https://github.com/qmu/plgg/pull/62
origin_branch: work-20260711-035119
origin_commit: c95e8028
last_seen: 2026-07-11T12:17:30+09:00
---

# CDN model load is an external runtime dependency of the PoC page

## Description

The RAG arm's embedding model (~25 MB) loads via a dynamic `import(variable)` from a CDN at page runtime rather than being bundled, keeping the shipped client bundle at ~225 KB ([25306ea0](https://github.com/qmu/plgg/commit/25306ea0), `packages/plgg-poc1-search/src/vendors/`). This is a deliberate, visible trade-off for a discardable PoC, but it does mean the RAG arm's availability depends on a third-party CDN being reachable at request time — a dependency the portal's design otherwise avoids (data sovereignty: corpus and index stay client-side, but the model itself does not).

## How to Fix

Leave as-is for the PoC (the measured cost is the point of the exercise); if the RAG arm is ever promoted past PoC status, revisit whether the model should be self-hosted or pinned to a specific CDN version to avoid an unpinned external runtime dependency.
