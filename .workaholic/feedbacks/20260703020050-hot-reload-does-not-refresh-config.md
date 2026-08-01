---
type: Feedback
title: Hot-reload does not refresh config file changes (site.config.ts)
kind: concern
source: development
created_at: 2026-07-03T02:00:50+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: hot-reload-does-not-refresh-config
owner: 
mission: 
tickets: []
origin_pr: 51
origin_pr_url: https://github.com/qmu/plgg/pull/51
origin_branch: work-20260701-185044
origin_commit: efd21c0
last_seen: 2026-07-03T02:00:50+09:00
---

# Hot-reload does not refresh config file changes (site.config.ts)

## Description

plgg-bundle dev hot-reload covers theme .ts edits and content rewrites, but site.config.ts changes still need a manual dev-server restart (see [684fde9](https://github.com/qmu/plgg/commit/684fde9))

## How to Fix

Document that config changes require a manual dev server restart; no automation planned
