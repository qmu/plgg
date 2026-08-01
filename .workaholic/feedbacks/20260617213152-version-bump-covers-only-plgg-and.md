---
type: Feedback
title: Version bump covers only plgg and plgg-server
kind: concern
source: development
created_at: 2026-06-17T21:31:52+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: version-bump-covers-only-plgg-and
owner: 
mission: 
tickets: []
origin_pr: 41
origin_pr_url: https://github.com/qmu/plgg/pull/41
origin_branch: work-20260617-002003
origin_commit: 8351741
last_seen: 2026-06-26T21:43:57+09:00
---

# Version bump covers only plgg and plgg-server

## Description

Downstream packages (`plgg-sql`/`plgg-foundry`/`plgg-kit`/`plgg-http`/`plgg-fetch`) were migrated to the new error model but their `package.json` versions were not bumped, so a consumer pinning those packages gets new error-shape behavior without a version change.

## How to Fix

Decide a monorepo versioning policy (bump-all on a cross-cutting core change, or adopt workspaces/changesets) before the next publish.
