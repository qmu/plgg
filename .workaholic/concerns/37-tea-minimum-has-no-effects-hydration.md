---
origin_pr: 37
origin_pr_url: https://github.com/qmu/plgg/pull/37
origin_branch: work-20260528-143038
origin_commit: 903308e
created_at: 2026-05-30T12:51:26+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# TEA minimum has no effects/hydration (new)

## Description

The minimal Elm Architecture ([a8d35bc](https://github.com/qmu/plgg/commit/a8d35bc)) is deliberately `sandbox` + full re-render with no `Cmd`/`Sub`, no vdom diffing, and no hydration — so an HTTP-backed app can't be written purely yet, the client takeover re-renders from `init` (SSR markup replaced, not reused), and every update re-attaches listeners.

## How to Fix

These are named follow-ups: a `Cmd`/effect seam for HTTP and programmatic navigation, vdom diffing for efficiency, and true hydration. Track as a follow-up epic when an HTTP-backed TEA app is needed.
