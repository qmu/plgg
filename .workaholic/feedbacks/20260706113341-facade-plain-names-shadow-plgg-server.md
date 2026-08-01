---
type: Feedback
title: (carried from PR #51) Facade plain names shadow plgg-server variants
kind: concern
source: development
created_at: 2026-07-06T11:33:41+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: facade-plain-names-shadow-plgg-server
owner: 
mission: 
tickets: []
origin_pr: 60
origin_pr_url: https://github.com/qmu/plgg/pull/60
origin_branch: work-20260704-130317
origin_commit: 416da301
last_seen: 2026-07-06T11:33:41+09:00
closed: resolved
resolved_by_pr: 540d2f36
---

# (carried from PR #51) Facade plain names shadow plgg-server variants

## Description

plggmatic's root barrel (`packages/plggmatic/src/index.ts`) resolves ambiguous cross-package names to plgg-view variants, shadowing plgg-server/plgg-md variants. Both facade barrels still exist.

## How to Fix

Restructure the facade to eliminate the ambiguity or document the shadowing explicitly.
