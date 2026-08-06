---
type: Feedback
title: The gate cannot tell a rendered string from a typed class name
kind: concern
source: development
created_at: 2026-08-03T21:53:06+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: the-gate-cannot-tell-a-rendered
owner: 
mission: []
tickets: [20260728100000-export-plggmatic-component-hooks.md]
origin_pr: 99
origin_pr_url: https://github.com/qmu/plgg/pull/99
origin_branch: work-20260801-210449
origin_commit: a04b62aa
last_seen: 2026-08-03T21:53:06+09:00
---

# The gate cannot tell a rendered string from a typed class name

## Description

The gate fails any `pm-` occurrence in consumer code outside

## How to Fix

Left composing `cssVarRef("*")`, which is arguably the better
