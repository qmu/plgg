---
type: Feedback
title: The exhibit-completeness guard is a magic-number floor, not a manifest
kind: concern
source: development
subject: observer_ai:a@qmu.jp
created_at: 2026-08-28T12:08:09+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: the-exhibit-completeness-guard-is-a
owner: 
mission: []
tickets: [20260828114602-serve-the-plggmatic-reference-exhibit-on-plgg-qmu-co-jp.md]
origin_pr: 137
origin_pr_url: https://github.com/qmu/plgg/pull/137
origin_branch: work-20260828-114954
origin_commit: 27c2fe2f
last_seen: 2026-08-28T12:08:09+09:00
---

# The exhibit-completeness guard is a magic-number floor, not a manifest

## Description

`nest-exhibit.ts` fails when fewer than 10 files land in the target — a snapshot of the exhibit's five pages and five bundles that nothing keeps in sync with the exhibit itself (see [2619dc3d](https://github.com/qmu/plgg/commit/2619dc3d) in `packages/guide/nest-exhibit.ts`)

## How to Fix

Assert the copy against its source — compare source and target file counts and require the five known page names — so the guard tracks the exhibit rather than a snapshot of it.
