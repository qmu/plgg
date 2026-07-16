---
type: Concern
concern_id: plgg-poc4c-livesite-is-orphaned-and
mission: [plggpress-technical-confidence-poc-portal]
tickets: [20260714214628-poc4-real-html-preview-with-4b-diff.md, 20260716125235-conclude-poc5-verdict-proven.md, 20260716125236-conclude-poc6-verdict-proven.md]
origin_pr: 73
origin_pr_url: https://github.com/qmu/plgg/pull/73
origin_branch: work-20260716-023712
origin_commit: 13d849c3
created_at: 2026-07-16T15:27:33+09:00
first_seen: 2026-07-16T15:27:33+09:00
last_seen: 2026-07-16T15:27:33+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# plgg-poc4c-livesite is orphaned and needs a delete-or-keep decision

## Description

Removing poc4c's portal record orphaned `packages/plgg-poc4c-livesite`: nothing links it, `build.sh`/`check-all` still carry it, and its reserved :5198 allocation is unused (see [fc9acefb](https://github.com/qmu/plgg/commit/fc9acefb)). It is cruft until decided.

## How to Fix

Delete the package (and its port reservation notes) or keep it as a documented reference artifact — either way, record the decision.
