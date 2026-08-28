---
type: Feedback
title: Acceptance completes only after the merge publishes production
kind: concern
source: development
subject: observer_ai:a@qmu.jp
created_at: 2026-08-28T12:08:09+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: acceptance-completes-only-after-the-merge
owner: 
mission: []
tickets: [20260828114602-serve-the-plggmatic-reference-exhibit-on-plgg-qmu-co-jp.md]
origin_pr: 137
origin_pr_url: https://github.com/qmu/plgg/pull/137
origin_branch: work-20260828-114954
origin_commit: 27c2fe2f
last_seen: 2026-08-28T12:08:09+09:00
---

# Acceptance completes only after the merge publishes production

## Description

`deploy-guide.yml` triggers on push to main, so the CI path that builds and nests the exhibit cannot be exercised before the merge; the pre-merge proof is the local build plus dist assertions (see [2619dc3d](https://github.com/qmu/plgg/commit/2619dc3d) in `.github/workflows/deploy-guide.yml`)

## How to Fix

Run the post-release probes immediately after the merge; if the nesting step fails on the runner, revert this commit to restore an exhibit-free but otherwise working guide.
