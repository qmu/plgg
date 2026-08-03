---
type: Feedback
title: A caller with a skewed clock gets a remote rejection, not a local error
kind: concern
source: development
created_at: 2026-08-03T21:47:01+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: a-caller-with-a-skewed-clock
owner: 
mission: []
tickets: [20260722120100-plgg-fetch-gcp-oauth-token-exchange.md]
origin_pr: 98
origin_pr_url: https://github.com/qmu/plgg/pull/98
origin_branch: work-20260801-191025
origin_commit: 4739b802
last_seen: 2026-08-03T21:47:01+09:00
---

# A caller with a skewed clock gets a remote rejection, not a local error

## Description

`issuedAtSeconds` is supplied by the caller, deliberately —

## How to Fix

Nothing in the library — inventing a clock check would
