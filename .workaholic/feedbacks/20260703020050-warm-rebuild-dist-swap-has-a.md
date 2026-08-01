---
type: Feedback
title: (carried from PR #47) Warm rebuild dist swap has a microsecond absence window
kind: concern
source: development
created_at: 2026-07-03T02:00:50+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: warm-rebuild-dist-swap-has-a
owner: 
mission: 
tickets: []
origin_pr: 51
origin_pr_url: https://github.com/qmu/plgg/pull/51
origin_branch: work-20260701-185044
origin_commit: efd21c0
last_seen: 2026-07-03T02:00:50+09:00
closed: superseded
---

# (carried from PR #47) Warm rebuild dist swap has a microsecond absence window

## Description

build.ts warm-rebuild two-rename dance was not changed; the microsecond absence window remains

## How to Fix

Implement an atomic dist publish (single rename) to eliminate the brief visibility window
