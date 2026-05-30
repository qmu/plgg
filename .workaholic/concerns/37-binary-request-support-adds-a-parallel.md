---
origin_pr: 37
origin_pr_url: https://github.com/qmu/plgg/pull/37
origin_branch: work-20260528-143038
origin_commit: 903308e
created_at: 2026-05-30T12:51:26+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# Binary request support adds a parallel `bytes` field rather than widening `body` (carried from PR #31)

## Description

`HttpRequest` (now in `packages/plgg-http/src/Http/model/HttpRequest.ts` after the extraction in [bf45ee6](https://github.com/qmu/plgg/commit/bf45ee6)) carries a separate `bytes: Option<Uint8Array>` field alongside `body: SoftStr` rather than widening `body` to a union — so callers must remember to check the parallel field.

## How to Fix

Keep the text-body default dominant (documented in the type comment); if future handlers need to switch on body kind, introduce a tagged-union request builder to remove the parallel-field footgun.
