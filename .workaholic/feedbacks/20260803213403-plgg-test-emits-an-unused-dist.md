---
type: Feedback
title: plgg-test emits an unused dist/hook.cjs.js
kind: concern
source: development
created_at: 2026-08-03T21:34:03+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: plgg-test-emits-an-unused-dist
owner: 
mission: []
tickets: [20260718210520-retire-relocate-other-bin-consumers.md]
origin_pr: 96
origin_pr_url: https://github.com/qmu/plgg/pull/96
origin_branch: work-20260801-182248
origin_commit: cbc80256
last_seen: 2026-08-03T21:34:03+09:00
---

# plgg-test emits an unused dist/hook.cjs.js

## Description

`formats` is a per-config setting, not per-entry, so adding the `hook`

## How to Fix

Either make `formats` overridable per entry in `plgg-bundle`'s config
