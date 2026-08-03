---
type: Feedback
title: The four launchers now share a predicate rather than a helper
kind: concern
source: development
created_at: 2026-08-03T21:34:03+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: the-four-launchers-now-share-a
owner: 
mission: []
tickets: [20260718210520-retire-relocate-other-bin-consumers.md]
origin_pr: 96
origin_pr_url: https://github.com/qmu/plgg/pull/96
origin_branch: work-20260801-182248
origin_commit: cbc80256
last_seen: 2026-08-03T21:34:03+09:00
---

# The four launchers now share a predicate rather than a helper

## Description

The ticket asked to factor any shared launcher helper that emerged.

## How to Fix

Nothing, deliberately — trading a dependency edge for five lines is
