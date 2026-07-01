---
origin_pr: 31
origin_pr_url: https://github.com/qmu/plgg/pull/31
origin_branch: work-20260513-182057
origin_commit: 71f411f
created_at: 2026-05-27T13:39:04+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# Binary request support adds a parallel `bytes` field rather than widening `body`

## Description

Binary request support was added as a separate `bytes: Option<Uint8Array>` field rather than widening `HttpRequest.body` to a union, because handlers read `body` as `SoftStr` (e.g., `decodeJson(c.req.body)`) and widening would force every handler to narrow. This preserved the text path with zero churn but introduces a parallel field callers must remember to check (see [daadcdb](https://github.com/qmu/plgg/commit/daadcdb) in `src/plgg-web/src/Http/model/HttpRequest.ts`).

## How to Fix

Keep the text-body default dominant (documented in the type comment); if future handlers need to switch on body kind, consider a tagged-union request builder to reduce parallel-field mistakes.
