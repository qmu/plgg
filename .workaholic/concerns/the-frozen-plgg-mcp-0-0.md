---
type: Concern
concern_id: the-frozen-plgg-mcp-0-0
mission: [plggpress-technical-confidence-poc-portal]
tickets: [20260716000445-plgg-mcp-exports-drag-in-plgg-content.md]
origin_pr: 76
origin_pr_url: https://github.com/qmu/plgg/pull/76
origin_branch: work-20260716-163314
origin_commit: 464436ed
created_at: 2026-07-16T18:00:34+09:00
first_seen: 2026-07-16T18:00:34+09:00
last_seen: 2026-07-16T18:00:34+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# The frozen plgg-mcp@0.0.1 consumer needs a migration decision

## Description

`plgg-mcp@0.0.2` is a smaller surface than the frozen 0.0.1 (`contentTools` moved to plgg-cms), so the external consumer pinned to 0.0.1 must choose: adopt 0.0.2 + plgg-cms for content tools, or stay frozen (see the archived ticket's analysis).

## How to Fix

File the migration note with that consumer when 0.0.2 publishes; it is out of this repo's mechanical scope.
