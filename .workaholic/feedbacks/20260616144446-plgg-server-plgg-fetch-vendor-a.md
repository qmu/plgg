---
type: Feedback
title: plgg-server / plgg-fetch vendor a copy of plgg-view at build time
kind: concern
source: development
created_at: 2026-06-16T14:44:46+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: plgg-server-plgg-fetch-vendor-a
owner: 
mission: 
tickets: []
origin_pr: 40
origin_pr_url: https://github.com/qmu/plgg/pull/40
origin_branch: work-20260531-003055
origin_commit: 470506e
last_seen: 2026-07-16T15:11:50+09:00
---

# plgg-server / plgg-fetch vendor a copy of plgg-view at build time

## Description

`plgg-server` bundles a copy of `plgg-view`'s `collectCss`, so a `plgg-view` change leaves stale vendored code until `plgg-server` is rebuilt — invisible to `tsc`, surfacing only at runtime (it emitted a `.undefinedundefined{}` rule into SSR for keyed elements; see [c5cb39f](https://github.com/qmu/plgg/commit/c5cb39f) and the example serving path).

## How to Fix

Document/automate the cross-package rebuild order (a change to a re-exported `plgg-view` fold requires rebuilding `plgg-server`/`plgg-fetch`), e.g. a `build:affected` step or a watch that rebuilds dependents.
