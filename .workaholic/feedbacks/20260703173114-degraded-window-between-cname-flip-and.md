---
type: Feedback
title: (carried from PR #52) Degraded window between CNAME flip and certificate provisioning
kind: concern
source: development
created_at: 2026-07-03T17:31:14+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: degraded-window-between-cname-flip-and
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

# (carried from PR #52) Degraded window between CNAME flip and certificate provisioning

## Description

A one-time operational note: when plgg.qmu.co.jp's CNAME was flipped from Cloudflare to Cloudflared, certificate issuance had a window of unavailability

## How to Fix

No retroactive fix; this is a historical record of an unavoidable deployment window
