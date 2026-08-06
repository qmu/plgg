---
type: Feedback
title: HttpStatus refinement is half-complete
kind: concern
source: development
created_at: 2026-07-03T02:00:50+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: httpstatus-refinement-is-half-complete
owner: 
mission: 
tickets: []
origin_pr: 51
origin_pr_url: https://github.com/qmu/plgg/pull/51
origin_branch: work-20260701-185044
origin_commit: efd21c0
last_seen: 2026-07-03T17:31:14+09:00
---

# HttpStatus refinement is half-complete

## Description

Response builders were changed to accept the HttpStatus brand, but sized-unsigned refinement for U16/U32 resource quantities (ports, byte caps, durations) was deferred and rescoped under principle (a) (see [c9d3e30](https://github.com/qmu/plgg/commit/c9d3e30))

## How to Fix

Document that U16/U32 author config (port, maxBodyBytes, timeouts) intentionally stays numeric per principle (a); only untrusted network status crosses the HttpStatus boundary
