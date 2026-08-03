---
type: Feedback
title: This branch and PR #97 both create vendors/webcrypto.ts and .workaholic/scan-allow
kind: concern
source: development
created_at: 2026-08-03T21:47:01+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: this-branch-and-pr-97-both
owner: 
mission: []
tickets: [20260722120100-plgg-fetch-gcp-oauth-token-exchange.md]
origin_pr: 98
origin_pr_url: https://github.com/qmu/plgg/pull/98
origin_branch: work-20260801-191025
origin_commit: 4739b802
last_seen: 2026-08-03T21:47:01+09:00
---

# This branch and PR #97 both create vendors/webcrypto.ts and .workaholic/scan-allow

## Description

Both were cut from `main` as separate PR-units, and each

## How to Fix

Merge #97 first, then rebase this branch; both conflicts are
