---
created_at: 2026-07-16T16:49:17+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, UX]
effort: 4h
commit_hash:
depends_on: 20260716164916-integration-1-browser-fts-core.md
category: Added
mission: plggpress-technical-confidence-poc-portal
---

# Integration 2/8: the static build emits the browser FTS index and a sitemap

## Overview

Second ticket of the post-PoC integration chain (see the mission's
`integration-plan.md`). `npx plggpress` must ship "indexed document data, plus
sitemap" (mission Reader goal). Add a post-render asset step to the plggpress
build pipeline (`packages/plggpress/src/build.ts` → `framework/Build`):

1. Chunk the discovered corpus by heading path and emit `fts.json` via
   `plgg-search` (script-routed EN + JA indexes as PoC 2's entrypoints do).
2. Generate `sitemap.xml` over the discovered route set (no PoC needed —
   straightforward; the mission names it explicitly).

## Considerations

- Index size budget: PoC 2 measured ja-fts.json ≈ 2.3 MB shipping the corpus
  whole. Emit as-is first; lazy-loading is a follow-up if a real corpus hurts.
- The build must stay deterministic (stable chunk ordering) — the SSG's
  content-hash friendliness is part of its contract.

## Quality Gate

- A `plggpress` build of the guide corpus emits `fts.json` (+ the JA index
  when the corpus routes require it) and `sitemap.xml` into `outDir`.
- Specs pin: chunker output deterministic; sitemap lists exactly the rendered
  routes; a corpus page's text is findable through the shipped index.
- check-all green; >90% coverage.

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; Prettier printWidth 50.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the
  index emitter is a build-pipeline usecase over the discovered content model,
  not a theme concern.
- `workaholic:implementation` / `policies/test.md` — determinism and
  route-coverage pins are the durable part of this ticket.
- `workaholic:design` / `policies/vendor-neutrality.md` — zero new deps; the
  sitemap generator is hand-rolled XML over the route set.
