---
created_at: 2026-07-19T01:12:15+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX]
effort: 4h
commit_hash:
category: Added
depends_on: [20260719011214-structure-grounded-extension-canonical-ir.md]
mission: build-the-plgg-ir-thesis-evaluator
---

# Phase 5b: end-to-end catalog acceptance + documentation guide

## Overview

Close the mission (design.md §5, §6): drive the **thirteen verification
catalog cases** end-to-end with their specified accept/reject outcomes and
counterexample diagnostics, and publish the **guide page** alongside the
plgg-ir guide.

## Key files

- `packages/plgg-ir-thesis/src/**` — end-to-end acceptance specs / fixtures
  for the 13 catalog cases (design.md §5; full IR sketches in the strategy
  book, [メタモデルの形式意味論](https://strategy.qmu.dev/metamodel-semantics)).
- `docs/plgg-ir/` (alongside the existing plgg-ir guide) — the new thesis
  guide page.

## Approach

- Assemble the design.md §4 reference example and the **thirteen catalog
  cases** (§5: rebuttal completeness, framework totality, circular
  reasoning, intra-stance consistency, blind-spot, straw-man, analogy,
  temporal coherence, transfer conservation, sort exclusivity,
  composition commutativity, survival semantics, weights-inert) as
  end-to-end fixtures, each asserting the specified accept/reject +
  counterexample.
- Write the **guide page** (objective, example-driven): the vocabulary,
  the five passes, and a worked accept + worked reject with its
  counterexample.

## Quality Gate

- **Acceptance (design.md acceptance item 9 + overall "done when"):** all
  thirteen catalog cases compile to their specified accept/reject outcomes
  with the expected counterexample diagnostics (end-to-end, through
  syntax → language → thesis passes). The guide page is published under
  `docs/` alongside the plgg-ir guide and its links are valid
  (`cd packages/guide && npm run build` — the dead-link check is **not**
  part of check-all — renders it green).
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`; `plgg-ir-manifest` untouched.

## Policies

- `workaholic:implementation` / `objective-documentation` (the catalog is
  the executable spec; the guide describes observable behavior).
- `workaholic:design` / `history-structures`; `workaholic:planning` /
  `modeling-centric-design` (the 13-case catalog *is* the model of done).
