---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711201840-poc2-reader-side-browser-agent.md, 20260712014500-poc2-japanese-grounding.md, 20260712023000-poc2-full-ja-article-corpus.md, 20260712024500-record-poc2-verdict.md, 20260712030000-poc3-writer-voice-assistant.md, 20260712040000-plgg-kit-realtime-ga-migration.md, 20260712113318-resume-poc3-verdict-and-ship.md]
origin_pr: 64
origin_pr_url: https://github.com/qmu/plgg/pull/64
origin_branch: work-20260712-003840
origin_commit: a9ff447f
created_at: 2026-07-12T14:15:15+09:00
last_seen: 2026-07-12T14:15:15+09:00
first_seen: 2026-07-12T14:15:15+09:00
concern_id: full-corpus-build-depends-on-the
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# Full-corpus build depends on the out-of-repo qmu-co-jp checkout

## Description

The full Japanese corpus lives in `~/projects/qmu-co-jp/docs`; `buildIndex.ts` resolves `QMU_DOCS`, then that path, falling back to the vendored 11 index pages, so clean-clone builds degrade to index-only retrieval quality.

## How to Fix

Documented on the package README; consider a larger vendored snapshot or a post-PoC integration decision on corpus distribution.
