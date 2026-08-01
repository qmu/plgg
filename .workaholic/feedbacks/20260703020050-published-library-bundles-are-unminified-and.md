---
type: Feedback
title: (carried from PR #47) Published library bundles are unminified and unshaken
kind: concern
source: development
created_at: 2026-07-03T02:00:50+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: published-library-bundles-are-unminified-and
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

# (carried from PR #47) Published library bundles are unminified and unshaken

## Description

emitBundle.ts was not changed; no minify/tree-shake pass was added

## How to Fix

Add optional minification and tree-shaking to emitBundle.ts for production dist; keep dev builds unminified for debugging
