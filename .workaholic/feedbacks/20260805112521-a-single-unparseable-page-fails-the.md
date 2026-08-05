---
type: Feedback
title: A single unparseable page fails the whole boot
kind: concern
source: development
created_at: 2026-08-05T11:25:21+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: a-single-unparseable-page-fails-the
owner: 
mission: []
tickets: [20260805035133-ingest-markdown-corpus-into-the-served-content-index.md]
origin_pr: 108
origin_pr_url: https://github.com/qmu/plgg/pull/108
origin_branch: work-20260805-104535
origin_commit: 3fa95f4e
last_seen: 2026-08-05T11:25:21+09:00
---

# A single unparseable page fails the whole boot

## Description

`indexInputsOf` short-circuits on the first page it cannot parse, and the serve seam turns that into a failed boot. This is deliberate — a partially-indexed corpus is the silent state this ticket exists to remove — but it means one malformed frontmatter fence anywhere takes the instance down rather than degrading (see [12a230bb](https://github.com/qmu/plgg/commit/12a230bb) in `packages/plgg-cms/src/content/Ingest/usecase/indexInputsOf.ts`).

## How to Fix

If an operator needs the instance to survive a bad page, report the failures as data (a per-page outcome list) and let the caller decide whether to boot; do not silently skip, which would reintroduce the invisible under-reporting.
