---
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
created_at: 2026-06-26T21:43:57+09:00
superseded_by: uint8array-not-directly-assignable-to-bodyinit
last_seen: 2026-06-26T21:43:57+09:00
first_seen: 2026-06-26T21:43:57+09:00
concern_id: uint8array-not-directly-assignable-to-bodyinit
severity: moderate
status: superseded
resolved_by_pr: 
resolved_by_commit: 
---

# (carried from PR #31) Uint8Array not directly assignable to BodyInit

## Description

The `toNativeResponse` ArrayBuffer-copy seam is unchanged; no HTTP source was modified.

## How to Fix

Verify the ArrayBuffer copy seam in `toNativeResponse` handles all edge cases (large bodies, streaming); consider whether a streaming path is needed for BodyInit compatibility.
