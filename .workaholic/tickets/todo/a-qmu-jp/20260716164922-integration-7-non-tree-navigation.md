---
created_at: 2026-07-16T16:49:22+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash:
depends_on: 20260716164916-integration-1-browser-fts-core.md
category: Added
mission: plggpress-technical-confidence-poc-portal
---

# Integration 7/8: non-tree classification navigation in the plggpress theme

## Overview

Seventh ticket of the post-PoC integration chain (see the mission's
`integration-plan.md`). Build PoC 6's classification into the SSG data model
and navigation: pure offline classification (tags from path segments +
front-matter `tags:`, links + inverse-adjacency backlinks —
`plgg-poc6-classify/src/classify.ts`), the closed-union `VariantQuery` + total
`runQuery` (`variants.ts`), the typed command parser, and the three agent
tools — alongside the existing `theme/sidebarTree.ts`.

## DECISION NEEDED (developer) — do not guess

PoC 6 deliberately concluded with NO winning variant — "the proven artifact is
the comparison itself." Production must pick which of tag-facets / link-graph /
multi-filter ships (or several). This is the product decision the verdict
explicitly reserved.

## Quality Gate

- The generated site navigates the corpus non-hierarchically per the chosen
  variant(s); the same typed command always returns the same page set (agent
  drivability preserved).
- Classification stays a deterministic pure function of the corpus.
- check-all green; >90% coverage.

## Policies

- `workaholic:implementation` / `policies/type-driven-design.md` — the closed
  `VariantQuery` union and total `runQuery` carry over unchanged.
- `workaholic:design` / `policies/ux.md` — the variant choice is judged on the
  real corpus before shipping (the PoC's side-by-side comparison is the
  evidence base).
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; Prettier printWidth 50.
