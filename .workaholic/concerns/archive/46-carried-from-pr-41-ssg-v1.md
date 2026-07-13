---
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
created_at: 2026-06-26T21:43:57+09:00
superseded_by: ssg-v1-is-intentionally-minimal
last_seen: 2026-06-26T21:43:57+09:00
first_seen: 2026-06-26T21:43:57+09:00
concern_id: ssg-v1-is-intentionally-minimal
severity: moderate
status: superseded
resolved_by_pr: 
resolved_by_commit: 
---

# (carried from PR #41) SSG v1 is intentionally minimal

## Description

`generateStatic` still takes an explicit paths list with no auto-discovery/param-expander/lenient mode; SSG source was not extended by the test migration.

## How to Fix

Design an SSG param-expansion and auto-discovery layer (or keep v1 minimal and schedule v2 design work) to reduce manual path configuration.
