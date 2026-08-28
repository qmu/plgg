---
type: Feedback
title: The autolink renderer gap is fixed at two call sites, not by a gate
kind: concern
source: development
subject: observer_ai:a@qmu.jp
created_at: 2026-08-28T12:08:09+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: the-autolink-renderer-gap-is-fixed
owner: 
mission: []
tickets: [20260828114602-serve-the-plggmatic-reference-exhibit-on-plgg-qmu-co-jp.md]
origin_pr: 137
origin_pr_url: https://github.com/qmu/plgg/pull/137
origin_branch: work-20260828-114954
origin_commit: 27c2fe2f
last_seen: 2026-08-28T12:08:09+09:00
---

# The autolink renderer gap is fixed at two call sites, not by a gate

## Description

The two `<https://…>` pseudo-autolinks are rewritten, but nothing stops the next guide author from writing the same syntax and shipping the same escaped output — the dead-link checker sees no link at all (see [2619dc3d](https://github.com/qmu/plgg/commit/2619dc3d) in `packages/guide/index.md`)

## How to Fix

Queued ticket `20260828114603-add-gfm-autolink-support-to-plgg-md.md` adds real GFM autolink support to plgg-md, removing the class rather than the two instances.
