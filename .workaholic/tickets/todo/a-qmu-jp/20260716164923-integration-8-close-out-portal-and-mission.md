---
created_at: 2026-07-16T16:49:23+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX]
effort: 1h
commit_hash:
depends_on: 20260716164922-integration-7-non-tree-navigation.md
category: Changed
mission: plggpress-technical-confidence-poc-portal
---

# Integration 8/8: close out the portal verdicts and the mission

## Overview

Final ticket of the post-PoC integration chain (see the mission's
`integration-plan.md`). When tickets 1–7 have landed:

1. Mark each portal record's integration state in
   `packages/plgg-poc-portal/src/pocs.ts` (the "portal verdicts closed out"
   half of the acceptance item) and rebuild the portal's static page (its SSG
   output is NOT covered by scripts/build.sh — the standing concern
   `portal-s-static-page-is-not`).
2. Resolve the standing deferred concerns this chain settles:
   `plgg-poc4c-livesite-is-orphaned-and` (delete-or-keep decision),
   `portal-s-static-page-is-not`, and `portal-s-verdict-data-is-hand` if the
   close-out freezes the data.
3. Decide the mission-comment question: does PoC 4b get its own acceptance
   line, or ride under PoC 4 (it rode; record it).
4. Tick the mission's final acceptance item; close the mission achieved via
   `/mission`.

## Quality Gate

- The portal page truthfully reflects integrated-vs-archived state for all
  seven PoCs; mission at 9/9 and closed achieved; the named concerns
  resolved or explicitly accepted.

## Policies

- `workaholic:implementation` / `policies/objective-documentation.md` — the
  close-out records what shipped, not aspiration; every portal statement
  traceable to a merged PR.
- `workaholic:operation` / `policies/ci-cd.md` — the portal rebuild step
  either joins scripts/build.sh or stays a documented manual step; not silent.
