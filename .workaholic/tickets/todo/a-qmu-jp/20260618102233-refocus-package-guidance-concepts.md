---
created_at: 2026-06-18T10:22:33+09:00
author: a@qmu.jp
type: refactoring
layer: [UX]
effort:
commit_hash:
category:
depends_on: [20260618102232-condense-curate-api-reference.md]
---

# Refocus package guidance pages on concepts & organization

## Overview

The "Packages" guidance pages currently double as a reference: they carry
**exhaustive API tables** (every Atomic, every Functional, the full combinator
list, etc.). With a condensed, high-quality API reference now owning the complete
vocabulary ([[20260618102232-condense-curate-api-reference]]), the guidance pages
should stop enumerating symbols and instead **teach**:

- **what** each package is and where it sits in the family,
- **how its vocabulary is organized** — the categories/groups and what each is
  for — rather than listing every member,
- a **few representative examples** that show the package in use.

Each guidance page then **links prominently to its comprehensive reference**
(`/api/<pkg>/`) for the full vocabulary. The two top-level sidebar groups stay as
they are — **"Packages" = guidance (conceptual)**, **"API reference" =
comprehensive (generated)** — with content rebalanced between them.

The "Guide" group (Getting started, Core concepts) is already beginner-oriented
and stays as-is; this ticket only refocuses the per-package pages.

## Key Files

- `packages/guide/packages/plgg/values-effects.md` — currently tables every
  Atomic/Basic/Functional; trim to "how the value & effect vocabulary is
  organized" + representative examples + link to `/api/plgg/`.
- `packages/guide/packages/plgg/structures-errors.md` — same: trim the
  Collectives/Conjunctives/error/abstracts tables to organizational prose.
- `packages/guide/packages/plgg/index.md` — the core landing; keep it the
  conceptual entry, link to the reference.
- `packages/guide/packages/{plgg-http,plgg-server,plgg-fetch,plgg-router,plgg-view,plgg-sql,plgg-kit,plgg-foundry}.md`
  — trim the model/vocabulary tables to "what it is + how it's organized + a few
  examples + → full API reference".
- `packages/guide/packages/example.md` — already a tutorial; leave conceptual,
  ensure it points at the relevant references.
- `packages/guide/.vitepress/config.ts` — the "Packages" sidebar group; confirm
  labels make the guidance-vs-reference distinction obvious (no structural change
  expected).

## Implementation Steps

1. For each package guidance page, replace exhaustive symbol tables with a short
   **organization** section (the categories/groups and their purpose) and **2–3
   representative, tested examples** (reuse the snippets already verified against
   source/specs).
2. Add a clear, prominent **"Full API reference → /api/<pkg>/"** link near the top
   (and/or end) of each guidance page.
3. Keep the genuinely *conceptual* tables that aid understanding (e.g. a small
   "categories of the vocabulary" overview) but drop per-symbol enumerations —
   those now live in the reference.
4. Re-verify cross-links: the guidance pages should link to the reference and to
   the relevant Core-concepts pages, not restate them.
5. Run `npm run build` in `packages/guide`; confirm `vitepress build` passes with
   no dead links (the reference links resolve against the condensed `/api/<pkg>/`).

## Considerations

- **Depends on the condensed reference.** The "→ full API reference" links target
  the condensed per-package pages from
  [[20260618102232-condense-curate-api-reference]]; implement that first so the
  link targets exist and are worth linking to.
- **Design lens (`standards:design`).** The guidance is the user's *reach* into
  the family; progressive disclosure means concept → organization → (reference for
  detail). Keep guidance modeless and scannable, not a wall of tables.
- **Single source of truth.** Concepts stay defined once in
  `packages/guide/concepts/*`; guidance pages link there rather than re-explaining
  Option/Result/cast/proc/match. (`packages/guide/concepts/`)
- **Samples come from real code** (the doc-conventions rule): keep using snippets
  verified against the packages' source/specs, not invented ones.
  (`packages/guide/contributing/conventions.md`)
- Sibling to the reference-quality ticket; together they implement the
  guidance-vs-reference differentiation.
  ([[20260618102232-condense-curate-api-reference]])
