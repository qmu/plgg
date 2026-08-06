---
type: Feedback
title: The index is rebuilt in full on every boot, with no incremental path
kind: concern
source: development
created_at: 2026-08-05T11:25:21+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: the-index-is-rebuilt-in-full
owner: 
mission: []
tickets: [20260805035133-ingest-markdown-corpus-into-the-served-content-index.md]
origin_pr: 108
origin_pr_url: https://github.com/qmu/plgg/pull/108
origin_branch: work-20260805-104535
origin_commit: 3fa95f4e
last_seen: 2026-08-05T11:25:21+09:00
---

# The index is rebuilt in full on every boot, with no incremental path

## Description

`ingestCorpus` reads and parses the whole corpus at startup. At 39 pages this is imperceptible, but the cost is linear in corpus size and paid on every restart, and `indexDocument`'s content-hash skip cannot help because an in-memory index starts empty (see [12a230bb](https://github.com/qmu/plgg/commit/12a230bb) in `packages/plgg-cms/src/content/Ingest/usecase/ingestCorpus.ts`). Ticket 16's Considerations already parked the remedy.

## How to Fix

If startup time becomes a problem, persist the index to a path and diff by `contentHash` at boot — the hash comparison is already implemented, so only the storage seam is missing.
