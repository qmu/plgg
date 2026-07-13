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
concern_id: portal-verdict-data-remains-hand-edited
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# Portal verdict data remains hand-edited

## Description

This branch again hand-edited `pocs.ts` for two status flips and one verdict (the `pocConsistent` invariant and its spec caught every inconsistency, as designed), but the standing suggestion to keep that gate mandatory for every future PoC ticket remains open.

## How to Fix

Keep `pocConsistent` + the fleet-consistency spec as the required gate in each PoC-concluding ticket.
