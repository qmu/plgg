---
type: Feedback
title: (carried from PR #40) plgg-server and plgg-fetch vendor a collection function
kind: concern
source: development
created_at: 2026-06-26T21:43:57+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: plgg-server-and-plgg-fetch-vendor
owner: 
mission: 
tickets: []
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
last_seen: 2026-06-26T21:43:57+09:00
closed: superseded
---

# (carried from PR #40) plgg-server and plgg-fetch vendor a collection function

## Description

plgg-server still vendors `collectCss` (`View/usecase/htmlDocument.ts`, `renderToString.ts`); no cross-package rebuild automation was added.

## How to Fix

Either factor `collectCss` into a shared package or implement workspace-aware rebuild automation so vendored code stays in sync.
