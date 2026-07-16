---
type: Concern
concern_id: portal-s-static-page-is-not
mission: [plggpress-technical-confidence-poc-portal]
tickets: [20260714214628-poc4-real-html-preview-with-4b-diff.md, 20260716125235-conclude-poc5-verdict-proven.md, 20260716125236-conclude-poc6-verdict-proven.md]
origin_pr: 73
origin_pr_url: https://github.com/qmu/plgg/pull/73
origin_branch: work-20260716-023712
origin_commit: 13d849c3
created_at: 2026-07-16T15:27:33+09:00
first_seen: 2026-07-16T15:27:33+09:00
last_seen: 2026-07-16T15:27:33+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# Portal's static page is not covered by scripts/build.sh, so verdict flips can serve stale

## Description

Flipping a verdict in `pocs.ts` leaves the live page at :5183 serving a stale render unless `npm run build` is run in `packages/plgg-poc-portal` — `scripts/build.sh` does not cover the SSG output, and nothing warns (observed live during [34be6698](https://github.com/qmu/plgg/commit/34be6698); the page still showed a "Building" badge until the manual rebuild).

## How to Fix

Add the portal's SSG render to `scripts/build.sh`, or make the manual rebuild a required step of the PoC-conclusion pattern.
