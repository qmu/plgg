---
type: Feedback
title: The claim heartbeat commits the index, not nothing
kind: concern
source: development
created_at: 2026-08-03T21:34:03+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: the-claim-heartbeat-commits-the-index
owner: 
mission: []
tickets: [20260718210520-retire-relocate-other-bin-consumers.md]
origin_pr: 96
origin_pr_url: https://github.com/qmu/plgg/pull/96
origin_branch: work-20260801-182248
origin_commit: cbc80256
last_seen: 2026-08-03T21:34:03+09:00
---

# The claim heartbeat commits the index, not nothing

## Description

`heartbeat.sh` documents itself as an empty commit that "changes no

## How to Fix

File it against the plugin repository through `/request` (the
