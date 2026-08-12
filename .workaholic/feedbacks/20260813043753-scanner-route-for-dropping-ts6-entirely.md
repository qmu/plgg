---
type: Feedback
title: Scanner route for dropping TS6 entirely remains unexercised
kind: concern
source: development
created_at: 2026-08-13T04:37:53+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: scanner-route-for-dropping-ts6-entirely
owner: a@qmu.jp
mission: [typescript-7-migration]
tickets: [20260812140001-map-the-typescript-7-api-gap.md, 20260812140002-port-plgg-bundle-to-typescript-7.md, 20260812140003-port-plgg-test-resolve-hook-to-typescript-7.md, 20260812140004-port-the-typecheck-gate-to-typescript-7.md, 20260812140005-adopt-typescript-7-and-record-the-tradeoff.md, 20260812140006-port-the-vendor-boundary-analyzer-to-typescript-7.md]
origin_pr: 117
origin_pr_url: https://github.com/qmu/plgg/pull/117
origin_branch: work-20260812-224232
origin_commit: b67532b7
last_seen: 2026-08-13T04:37:53+09:00
---

# Scanner route for dropping TS6 entirely remains unexercised

## Description

The TS7 scanner PoC in docs/typescript-7-api-gap.md (including the changed `createScanner` signature that fails silently) is the migration path if TS6 is ever fully dropped, but no production code exercises it yet (see [ea423fbc](https://github.com/qmu/plgg/commit/ea423fbc))

## How to Fix

Re-evaluate at each TS 7.x minor; port the analyzer via the PoC when a file-level transpile API lands for the other two consumers
