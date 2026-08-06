---
type: Feedback
title: The root manifest makes scripts/*.ts typeless, and the obvious fix is wrong
kind: concern
source: development
created_at: 2026-08-03T21:58:15+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: the-root-manifest-makes-scripts-ts
owner: 
mission: []
tickets: [20260721180002-evaluate-npm-workspaces.md]
origin_pr: 100
origin_pr_url: https://github.com/qmu/plgg/pull/100
origin_branch: work-20260801-211738
origin_commit: 6c2c1414
last_seen: 2026-08-03T21:58:15+09:00
---

# The root manifest makes scripts/*.ts typeless, and the obvious fix is wrong

## Description

A root `package.json` is now the nearest manifest for

## How to Fix

**Not** by adding `"type": "module"` to the root, which is
