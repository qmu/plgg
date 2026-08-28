---
type: Feedback
title: The guide build is outside check-all, and nest-exhibit.ts is outside the typecheck gate
kind: concern
source: development
subject: observer_ai:a@qmu.jp
created_at: 2026-08-28T12:08:09+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: the-guide-build-is-outside-check
owner: 
mission: []
tickets: [20260828114602-serve-the-plggmatic-reference-exhibit-on-plgg-qmu-co-jp.md]
origin_pr: 137
origin_pr_url: https://github.com/qmu/plgg/pull/137
origin_branch: work-20260828-114954
origin_commit: 27c2fe2f
last_seen: 2026-08-28T12:08:09+09:00
---

# The guide build is outside check-all, and nest-exhibit.ts is outside the typecheck gate

## Description

`nest-exhibit.ts` sits deliberately outside `packages/guide/tsconfig.json`'s scope, so `node scripts/typecheck.ts` never sees it, and `./scripts/check-all.sh` does not run the guide build; the only exerciser is `npm run build --prefix packages/guide`, whose first unattended execution is inside the deploy workflow, after the merge (see [2619dc3d](https://github.com/qmu/plgg/commit/2619dc3d) in `packages/guide/nest-exhibit.ts`)

## How to Fix

Add the guide build to check-all, or bring `nest-exhibit.ts` and `site.config.ts` into a small tooling tsconfig so the typecheck gate covers them without widening the Worker program's scope.
