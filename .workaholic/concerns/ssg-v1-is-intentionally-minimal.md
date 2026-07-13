---
origin_pr: 41
origin_pr_url: https://github.com/qmu/plgg/pull/41
origin_branch: work-20260617-002003
origin_commit: 8351741
created_at: 2026-06-17T21:31:52+09:00
last_seen: 2026-06-26T21:43:57+09:00
first_seen: 2026-06-17T21:31:52+09:00
concern_id: ssg-v1-is-intentionally-minimal
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# SSG v1 is intentionally minimal

## Description

`generateStatic` takes an explicit `paths` list only — no static-route auto-discovery, no per-pattern param expander, and no lenient skip-and-report mode (a single bad route fails the whole build). plgg-view does not hydrate, so SSG output is first-paint/SEO only (see [4669f60](https://github.com/qmu/plgg/commit/4669f60) in `packages/plgg-server/src/Ssg/`).

## How to Fix

Add `staticPaths(app)` auto-discovery of fully-`Static` GET routes, a param expander, and an opt-in lenient mode as follow-up tickets when a real site needs them.
