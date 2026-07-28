---
created_at: 2026-07-28T09:04:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash:
category: Added
depends_on: [20260728090300-highlight-span-exactly-once.md]
mission: make-the-column-strip-a-real-navigation-surface
---

# Strip 5/11 — Back means "close that column", including several steps of it

## Overview

A navigation runtime that pushes history without handling
`popstate` is worse than no runtime: Back leaves the reader
on a URL whose composition no longer matches what the DOM
shows. This ticket makes Back exact — it removes the column
the matching forward navigation added and restores the
previous composition, and it does so repeatedly, all the way
back to the entry page.

## Key files

- `packages/plggmatic/src/Navigate/usecase/navigate.ts` —
  the pure reconciler belongs here.
- `packages/plggmatic/src/Navigate/usecase/navigationScript.ts`
  — the `popstate` listener and the DOM application.
- `packages/plggmatic/src/Navigate/usecase/compositionUrl.ts`
  — decoding the composition the browser restored.

## Approach

- **Reconcile, do not undo.** The listener does not remember
  what each navigation did; it decodes the composition the
  restored URL carries and reconciles the strip to it. A
  pure `reconcile(current, target)` returns the ordered plan
  — which existing columns to keep (matched by route and
  span, in order), which to drop, which to fetch — and the
  runtime executes it. That makes Back, Forward, a
  multi-step Back, and a pasted URL the same operation, and
  it is the shape ticket 10's assistant needs anyway.
- Kept columns keep their DOM nodes, so going Back and
  Forward across a column does not reset its scroll or
  refetch it.
- The very first entry has no pushed state: reaching the
  entry composition by Back must restore exactly the strip
  the server would render for that URL.
- The reconciler is a pure function over data — the whole
  correctness argument is unit-testable, and the browser run
  confirms the wiring rather than discovering the logic.

## Quality Gate

- **Acceptance:** in a real browser on port 4130 — open
  three columns by clicking two links, press Back twice, and
  observe after each: the rightmost column is gone, the
  remaining columns are the SAME DOM nodes (a marker set on
  a kept node survives), scroll positions are intact, and
  the URL matches the composition shown. Press Forward and
  the column returns. Screenshot recorded.
- `reconcile` spec covers: append, drop, drop-many, replace
  a middle column, span-only change, and identical
  compositions (a no-op plan).
- Back to the entry page restores the server's own strip,
  verified live.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage across all four metrics; no `as`/`any`/
  `ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:operation` — the running surface recovers: any
  history entry, however reached, is reconstructible from
  its URL alone.
