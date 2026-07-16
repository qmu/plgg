---
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
created_at: 2026-06-26T21:43:57+09:00
last_seen: 2026-06-26T21:43:57+09:00
first_seen: 2026-06-26T21:43:57+09:00
concern_id: plgg-server-and-plgg-fetch-vendor
severity: moderate
status: superseded
resolved_by_pr: 
resolved_by_commit: 
superseded_by: plgg-server-plgg-fetch-vendor-a
---

# (carried from PR #40) plgg-server and plgg-fetch vendor a collection function

## Description

plgg-server still vendors `collectCss` (`View/usecase/htmlDocument.ts`, `renderToString.ts`); no cross-package rebuild automation was added.

## How to Fix

Either factor `collectCss` into a shared package or implement workspace-aware rebuild automation so vendored code stays in sync.
