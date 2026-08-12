---
type: Feedback
title: Dependabot collides with the split-version strategy
kind: concern
source: development
created_at: 2026-08-13T04:37:53+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: dependabot-collides-with-the-split-version
owner: a@qmu.jp
mission: [typescript-7-migration]
tickets: [20260812140001-map-the-typescript-7-api-gap.md, 20260812140002-port-plgg-bundle-to-typescript-7.md, 20260812140003-port-plgg-test-resolve-hook-to-typescript-7.md, 20260812140004-port-the-typecheck-gate-to-typescript-7.md, 20260812140005-adopt-typescript-7-and-record-the-tradeoff.md, 20260812140006-port-the-vendor-boundary-analyzer-to-typescript-7.md]
origin_pr: 117
origin_pr_url: https://github.com/qmu/plgg/pull/117
origin_branch: work-20260812-224232
origin_commit: b67532b7
last_seen: 2026-08-13T04:37:53+09:00
---

# Dependabot collides with the split-version strategy

## Description

dependabot proposes uniform 29-manifest bumps; split-version needs 27 to move and 2 to stay. Every future 7.x release will re-open an all-or-nothing PR like #112 (see [914914bf](https://github.com/qmu/plgg/commit/914914bf))

## How to Fix

Add dependabot `ignore` rules exempting plgg-bundle and plgg-test's `typescript` from major bumps
