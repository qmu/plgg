---
type: Feedback
title: The scanner's credential rule fires on the OAuth wire vocabulary
kind: concern
source: development
created_at: 2026-08-03T21:47:01+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: the-scanner-s-credential-rule-fires
owner: 
mission: []
tickets: [20260722120100-plgg-fetch-gcp-oauth-token-exchange.md]
origin_pr: 98
origin_pr_url: https://github.com/qmu/plgg/pull/98
origin_branch: work-20260801-191025
origin_commit: 4739b802
last_seen: 2026-08-03T21:47:01+09:00
---

# The scanner's credential rule fires on the OAuth wire vocabulary

## Description

`access_token`, `token_type` and `Bearer` beside string

## How to Fix

Declared narrowly in `.workaholic/scan-allow` rather than
