---
type: Feedback
title: `Uint8Array` not directly assignable to `BodyInit` under current lib types
kind: concern
source: development
created_at: 2026-05-27T13:39:04+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: uint8array-not-directly-assignable-to-bodyinit
owner: 
mission: 
tickets: []
origin_pr: 31
origin_pr_url: https://github.com/qmu/plgg/pull/31
origin_branch: work-20260513-182057
origin_commit: 71f411f
last_seen: 2026-06-26T21:43:57+09:00
---

# `Uint8Array` not directly assignable to `BodyInit` under current lib types

## Description

The stdlib's generic `Uint8Array<ArrayBufferLike>` does not unify with the concrete `BodyInit` union, even though `new Request(url, { body: arrayBuffer })` is fine. The workaround copies the view into a standalone `ArrayBuffer` at the seam — the same pattern `serve.ts`'s `collectBody` already uses (see [daadcdb](https://github.com/qmu/plgg/commit/daadcdb) in `src/plgg-web/src/Http/usecase/toNativeResponse.ts`).

## How to Fix

When hitting this error in the future, reach for the `ArrayBuffer` copy rather than a cast; documented as a seam-level quirk.
