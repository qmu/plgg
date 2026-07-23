---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711035317-plggpress-poc-portal-and-plan.md, 20260711035318-poc1-browser-search-core.md]
origin_pr: 62
origin_pr_url: https://github.com/qmu/plgg/pull/62
origin_branch: work-20260711-035119
origin_commit: c95e8028
created_at: 2026-07-11T12:17:30+09:00
last_seen: 2026-07-11T12:17:30+09:00
first_seen: 2026-07-11T12:17:30+09:00
concern_id: rag-arm-s-in-browser-model
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# RAG arm's in-browser model init unverified outside a real browser

## Description

PoC 1's vector-RAG arm loads a MiniLM embedding model via ONNX/WASM (`@huggingface/transformers` from a CDN) to embed queries client-side. Headless chromium's `--virtual-time-budget`/`--dump-dom` harness could not drive the WASM module init to completion — probes isolated the stall to the model's `pipeline()` initialization itself (the identical call completes in Node), not to this app's code — so only the FTS arm was confirmed ranking end-to-end in the automated headless run ([25306ea0](https://github.com/qmu/plgg/commit/25306ea0), `packages/plgg-poc1-search/src/vendors/`). The app shows its designed loading/failed states meanwhile and FTS stays fully functional (graceful degradation), so nothing is silently broken, but the RAG arm's actual behavior in a real browser remains unconfirmed.

## How to Fix

Open `https://plgg-poc1.qmu.dev/` in a real (non-headless) browser or a Playwright interactive session, confirm the RAG arm completes model init and returns ranked results, and record that verdict — including the vector arm's from-scratch cost estimate — on the portal's PoC 1 record (`packages/plgg-poc-portal/src/pocs.ts`) as the ticket's designated morning gate.
