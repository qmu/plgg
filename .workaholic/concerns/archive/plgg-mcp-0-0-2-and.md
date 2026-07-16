---
type: Concern
concern_id: plgg-mcp-0-0-2-and
mission: [plggpress-technical-confidence-poc-portal]
tickets: [20260716000445-plgg-mcp-exports-drag-in-plgg-content.md]
origin_pr: 76
origin_pr_url: https://github.com/qmu/plgg/pull/76
origin_branch: work-20260716-163314
origin_commit: 464436ed
created_at: 2026-07-16T18:00:34+09:00
first_seen: 2026-07-16T18:00:34+09:00
last_seen: 2026-07-16T18:00:34+09:00
severity: moderate
status: resolved
resolved_by_pr:
resolved_by_commit:
closed_reason: plgg-mcp@0.0.2 (now latest) and plgg-cms@0.0.3 published and scratch-verified 2026-07-16: import exposes the protocol substrate, contentTools correctly absent, zero node:sqlite in the published dist
closed_at: 2026-07-16T18:02:11+09:00
---

# plgg-mcp@0.0.2 and plgg-cms@0.0.3 are not on npm until the developer publish

## Description

Both bumped packages reach the registry only through the ship-time developer-driven publish gate — which is currently also holding PR #75's two dialect packages (the earlier gate found no publish had run). Until published, the frozen `plgg-mcp@0.0.1` remains `latest` with the old content-coupled surface (see [d43ccced](https://github.com/qmu/plgg/commit/d43ccced)).

## How to Fix

Run `SKIP_GATE=1 ./scripts/publish-npm.sh` on this host when shipping; the preflight lists the pending set.
