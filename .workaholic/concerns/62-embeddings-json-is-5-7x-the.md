---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711035317-plggpress-poc-portal-and-plan.md, 20260711035318-poc1-browser-search-core.md]
origin_pr: 62
origin_pr_url: https://github.com/qmu/plgg/pull/62
origin_branch: work-20260711-035119
origin_commit: c95e8028
created_at: 2026-07-11T12:17:30+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# embeddings.json is 5.7x the corpus size

## Description

The build-time embeddings asset for the RAG arm is ~1.4 MB against a ~118 KB source corpus (178 chunks), i.e. roughly 5.7x — this ratio is itself the affordability datum the plggpress vision's "vector RAG only when its full scratch cost is affordable" question asks for ([25306ea0](https://github.com/qmu/plgg/commit/25306ea0), `packages/plgg-poc1-search/dist/index/embeddings.json`). Because the ratio is per-chunk (dimensions × chunk count), it will only grow as the guide corpus grows, unlike the FTS index which scales more gently.

## How to Fix

No fix needed now; carry this ratio into the portal's recorded verdict for PoC 1 so any later production-integration decision is measured against a corpus-size-scaled projection, not just today's absolute numbers.
