---
created_at: 2026-07-16T16:49:16+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash:
category: Added
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Integration 1/8: port the browser-side FTS search core into production as `plgg-search`

## Overview

First ticket of the post-PoC integration chain (the mission's last acceptance
item; full decomposition in the mission's `integration-plan.md`). PoC 1's
verdict picked from-scratch, zero-dep, **browser-side** BM25 over vector RAG;
PoC 2/3 proved reader grounding and the agent-driven search loop over it. The
production home is a new small package **`plgg-search`** (the plan's
recommended default — plggpress and plgg-cms both consume it), following the
plgg-parser precedent for a zero-dep core.

## What to port (pure, already spec-covered — port, don't rewrite)

- `packages/plgg-poc1-search/src/search/tokenize.ts` — latin `[a-z0-9]+` runs
  PLUS `Intl.Segmenter("ja")` word mode, bigram fallback embedded in the index
  value so index/query strategy cannot mismatch.
- `packages/plgg-poc1-search/src/search/fts.ts` — the from-scratch inverted
  index + BM25 ranking.
- The heading-path chunker from `packages/plgg-poc1-search/src/indexer/`.
- Do NOT port the vector arm (`rag.ts`, `vendors/`, transformers) — PoC 1's
  verdict rejected it for the browser.

## Quality Gate

- New `packages/plgg-search` per the family scaffold (no type:module,
  rootDir src, printWidth 50, plgg-test >90% coverage, README + root index,
  build.sh/npm-install.sh wiring, vendor-boundary clean).
- Runtime dependency set: exactly `plgg` (pin like plgg-mcp's moduleGraph
  spec — this core must stay browser-shippable).
- The ported specs (tokenizer incl. CJK, BM25 ranking, chunker) green.
- Refactor the seeds to house style where the PoC code drifts (don't clone
  garbage) — annotate at boundaries.
- check-all green.

## Policies

- `workaholic:implementation` / `directory-structure`, `coding-standards`;
  `workaholic:design` / `vendor-neutrality` (zero new deps).
