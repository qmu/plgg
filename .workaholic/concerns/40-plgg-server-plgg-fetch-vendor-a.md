---
origin_pr: 40
origin_pr_url: https://github.com/qmu/plgg/pull/40
origin_branch: work-20260531-003055
origin_commit: 470506e
created_at: 2026-06-16T14:44:46+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# plgg-server / plgg-fetch vendor a copy of plgg-view at build time

## Description

`plgg-server` bundles a copy of `plgg-view`'s `collectCss`, so a `plgg-view` change leaves stale vendored code until `plgg-server` is rebuilt — invisible to `tsc`, surfacing only at runtime (it emitted a `.undefinedundefined{}` rule into SSR for keyed elements; see [c5cb39f](https://github.com/qmu/plgg/commit/c5cb39f) and the example serving path).

## How to Fix

Document/automate the cross-package rebuild order (a change to a re-exported `plgg-view` fold requires rebuilding `plgg-server`/`plgg-fetch`), e.g. a `build:affected` step or a watch that rebuilds dependents.
