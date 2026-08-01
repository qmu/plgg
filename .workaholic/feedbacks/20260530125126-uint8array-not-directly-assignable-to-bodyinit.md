---
type: Feedback
title: `Uint8Array` not directly assignable to `BodyInit` (carried from PR #31)
kind: concern
source: development
created_at: 2026-05-30T12:51:26+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: uint8array-not-directly-assignable-to-bodyinit
owner: 
mission: 
tickets: []
origin_pr: 37
origin_pr_url: https://github.com/qmu/plgg/pull/37
origin_branch: work-20260528-143038
origin_commit: 903308e
last_seen: 2026-05-30T12:51:26+09:00
closed: superseded
---

# `Uint8Array` not directly assignable to `BodyInit` (carried from PR #31)

## Description

The stdlib's generic `Uint8Array<ArrayBufferLike>` doesn't unify with the concrete `BodyInit` union, so `packages/plgg-server/src/Http/usecase/toNativeResponse.ts` copies the view into a standalone `ArrayBuffer` at the seam.

## How to Fix

Keep the `ArrayBuffer` copy (never an `as` cast); document it as a seam-level lib-types quirk.
