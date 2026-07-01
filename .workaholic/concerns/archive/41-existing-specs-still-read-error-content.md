---
origin_pr: 41
origin_pr_url: https://github.com/qmu/plgg/pull/41
origin_branch: work-20260617-002003
origin_commit: 8351741
created_at: 2026-06-17T21:31:52+09:00
severity: low
status: resolved
resolved_by_pr: 00c1dc8
resolved_by_commit: 
---

# Existing specs still read error content by hand

## Description

The P2 accessor (`plggErrorMessage`/`resultErrorMessage`) routed library code off the `result.content.content.message` double-hop, but ~40 existing spec sites still reach two `.content` levels by hand (see [787f215](https://github.com/qmu/plgg/commit/787f215)). New code should use the accessor; the specs were deliberately not churned.

## How to Fix

Opportunistically migrate spec reads to the accessor when touching those files; do not bulk-churn.
