---
origin_pr: 41
origin_pr_url: https://github.com/qmu/plgg/pull/41
origin_branch: work-20260617-002003
origin_commit: 8351741
created_at: 2026-06-17T21:31:52+09:00
last_seen: 2026-06-17T21:31:52+09:00
first_seen: 2026-06-17T21:31:52+09:00
concern_id: shared-boundary-error-primitive-not-yet
severity: moderate
status: resolved
resolved_by_pr: a8cf932
resolved_by_commit: 
---

# Shared "boundary error" primitive not yet factored

## Description

`Defect`, `SqlError`, and (by the same pattern) the existing `HttpError`/`ClientError` each independently re-implement the shape `Box<Tag, { message, cause }>` plus a hand-rolled `toXxxError(cause)` doing the same `instanceof Error ? …` lift (see [c3027fc](https://github.com/qmu/plgg/commit/c3027fc) in `packages/plgg/src/Exceptionals/Cause.ts` and `packages/plgg-sql/src/Db/model/Db.ts`). This is structural cloning that will replicate once per package owning a boundary error.

## How to Fix

Factor a shared core primitive — a tagged `{ message, cause: Option<Cause> }` constructor plus a single `liftThrow(tag)(cause)` helper — and let `Defect`/`SqlError`/`HttpError` be one-line specializations. The `Cause` type added this branch is the seed.
