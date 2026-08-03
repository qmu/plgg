---
type: Feedback
title: (carried from PR #51) HttpStatus refinement is half complete
kind: concern
source: development
created_at: 2026-07-03T17:31:14+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: httpstatus-refinement-is-half-complete
owner: 
mission: 
tickets: []
origin_pr: 53
origin_pr_url: https://github.com/qmu/plgg/pull/53
origin_branch: work-20260703-050355
origin_commit: 0ddb00d
last_seen: 2026-07-03T17:31:14+09:00
closed: superseded
---

# (carried from PR #51) HttpStatus refinement is half complete

## Description

The HTTP status codes use sized-unsigned U16/U32 but the refinement is deferred; the type remains as documentation, not as checked bounds

## How to Fix

Implement sized-unsigned type families in plgg-core (U16, U32 as subtypes of number); deferred
