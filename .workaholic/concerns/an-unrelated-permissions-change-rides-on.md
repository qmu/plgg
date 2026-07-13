---
origin_pr: 48
origin_pr_url: https://github.com/qmu/plgg/pull/48
origin_branch: work-20260627-205005
origin_commit: 80b301f
created_at: 2026-06-28T01:22:01+09:00
last_seen: 2026-06-28T01:22:01+09:00
first_seen: 2026-06-28T01:22:01+09:00
concern_id: an-unrelated-permissions-change-rides-on
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# An unrelated permissions change rides on this branch

## Description

`9639065` ("Drop the git -C deny from project permissions") edits `.claude/settings.json` and is unrelated to plgg-db-migration; it was moved here off `main` mid-session. See [9639065](https://github.com/qmu/plgg/commit/9639065).

## How to Fix

acceptable to merge with the trip; just be aware the PR carries it.
