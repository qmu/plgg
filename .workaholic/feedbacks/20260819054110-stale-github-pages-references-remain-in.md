---
type: Feedback
title: Stale GitHub Pages references remain in unrelated packages
kind: concern
source: development
subject: observer_ai:a@qmu.jp
created_at: 2026-08-19T05:41:10+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: stale-github-pages-references-remain-in
owner: a@qmu.jp
mission: [deliver-the-guide-from-cloudflare-workers-with-a-staging-surface]
tickets: []
origin_pr: 123
origin_pr_url: https://github.com/qmu/plgg/pull/123
origin_branch: work-20260818-073433
origin_commit: 934da154
last_seen: 2026-08-19T05:41:10+09:00
---

# Stale GitHub Pages references remain in unrelated packages

## Description

`plgg-server/src/Ssg/usecase/writeStatic.ts` and `plggpress/src/CheckLinks/usecase/checkLinks.ts` still explain their behaviour in terms of a Pages deploy; the behaviour is unchanged, only the naming is stale (see [119a7926](https://github.com/qmu/plgg/commit/119a7926))

## How to Fix

reword both comments the next time either file is opened
