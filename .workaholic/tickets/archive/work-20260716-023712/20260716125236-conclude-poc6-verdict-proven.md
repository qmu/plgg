---
created_at: 2026-07-16T12:52:36+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX]
effort: 0.5h
commit_hash:
category: Changed
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Conclude PoC 6: flip the `poc6` record to `proven` with the developer's live verdict

## Overview

PoC 6 ("Non-tree file classification") was **approved by the developer on
2026-07-16** after live review at `plgg-poc6.qmu.dev` (route applied and tunnel
validated 2026-07-16; the app serves its real shell). Its `pocs.ts` record is
still `status: "building"` with `verdict: none()` — the build ticket
(`20260714022000`, archived) deliberately left the verdict to a separate
concluding ticket, which is this one, exactly as PoC 2 / 3 / 4 / 4b were
concluded.

This is a **record-only change**: the `poc6` entry in `pocs.ts` (status +
verdict). No PoC 6 package code changes.

## The verdict's factual basis (do not overclaim)

The developer's live judgment was a plain approval ("approve poc 5/6") — no
single variant was singled out, so the verdict must NOT claim a winning
variant; the proven artifact is the comparison itself. The measured build facts
(from the archived build ticket and `packages/plgg-poc6-classify/README.md`):

- Three navigation variants — tag facets (AND/OR), link/backlink graph,
  multi-dimensional filter (tags + path text) — render side by side over one
  real corpus, so they are comparable on a single page.
- Each variant's search is a deterministic pure function of `(pages, query)`:
  the typed command path (`facets` / `links` / `filter`) parses each line to
  exactly one closed-union `VariantQuery` routed through the total, exhaustive
  `runQuery`, so the same command always returns the same page set — the
  agent-drivability the confidence signal asks for, checkable headlessly.
- The Realtime voice session is the bonus second way in, calling the same three
  tools (`query_facets`, `query_links`, `query_filter`).
- Classification is derived purely offline: tags from path segments plus
  front-matter `tags:`, links from in-corpus markdown links with backlinks as
  the inverse adjacency.

## Policies

- `workaholic:implementation` / `objective-documentation` — record the
  developer's approval and the measured build facts; no fabricated
  observations, no invented variant preference.
- Portal invariant — a concluding status MUST carry a verdict; keep
  `pocConsistent` green.

## Key Files

- `packages/plgg-poc-portal/src/pocs.ts` — the `poc6` record: flip
  `status: "building"` → `"proven"`, `verdict: none()` → `some(...)`.
- `packages/plgg-poc-portal/src/Poc.spec.ts`, `view.spec.ts` — must stay green.

## Implementation Steps

1. Edit the `poc6` record in `pocs.ts` per the factual basis above.
2. Portal specs green (`pocConsistent` satisfied, coverage >90%).
3. `scripts/tsc-plgg.sh` clean; Prettier printWidth 50; fresh
   `scripts/check-all.sh` EXIT 0.

## Quality Gate

- The `poc6` record reads `proven` with a verdict stating only the approval and
  measured build facts; portal specs green; fresh `check-all` EXIT 0; no
  `as`/`any`/`ts-ignore`.
