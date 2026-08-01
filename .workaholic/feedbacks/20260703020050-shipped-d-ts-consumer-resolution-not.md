---
type: Feedback
title: (carried from PR #48) Shipped .d.ts consumer resolution not verified under NodeNext
kind: concern
source: development
created_at: 2026-07-03T02:00:50+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: shipped-d-ts-consumer-resolution-not
owner: 
mission: 
tickets: []
origin_pr: 51
origin_pr_url: https://github.com/qmu/plgg/pull/51
origin_branch: work-20260701-185044
origin_commit: efd21c0
last_seen: 2026-07-03T02:00:50+09:00
closed: resolved
resolved_by_pr: 0e7f9cd
---

# (carried from PR #48) Shipped .d.ts consumer resolution not verified under NodeNext

## Description

plgg-db-migration's emitted .d.ts has still not been type-resolved under a NodeNext consumer tsconfig

## How to Fix

Test plgg-db-migration .d.ts under `moduleResolution: "NodeNext"` in a consumer tsconfig and fix any resolution gaps
