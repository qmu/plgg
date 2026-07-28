---
created_at: 2026-07-28T09:08:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 2h
commit_hash:
category: Added
depends_on: [20260728090500-no-javascript-proof.md]
mission: make-the-column-strip-a-real-navigation-surface
---

# Strip 9/11 — you can SEE what the assistant changed: was → became, in place

## Overview

After a voice edit the prose simply changes. The writer has
to take the assistant's word for what it did. This ticket
shows the change: the affected passage displays what it
**was** and what it **became**, in place, so the writer
judges the edit instead of trusting it — and the display
survives the in-place content swap that follows the write.

## Key files

- `packages/plggpress/src/framework/DevServer/usecase/editDoc.ts`
  — `EditOp {find, replace}` and `locateEdits`: the edit's
  previous and current text are already both in hand at the
  moment of application. Nothing needs to be inferred.
- `packages/plggpress/src/framework/DevServer/node/patchWeb.ts`
  — the one write path; its typed answer is where the
  applied edit becomes knowable to the browser.
- `packages/plggpress/src/framework/DevServer/browser/voiceClient.ts`
  — `runEditTool`, and `swapContent`, which replaces the
  body's children (so a mark placed before the swap is
  destroyed unless it is re-derived, exactly as `focused`
  already is).
- `packages/plgg-poc4b-coedit/src/edit.ts` — the PoC's
  diff-segment surface, deliberately left behind when the
  write half was promoted. Consult it; promote only what
  this display needs.

## Approach

- The bridge's answer carries the applied ops (`find`,
  `replace`) — the provenance is data the server already
  has, not a client guess.
- After the swap, the changed passage is located in the NEW
  content by its `replace` text through the same
  exactly-once locator ticket 4 shares, and wrapped in a
  provenance mark showing the previous text alongside the
  current. Located exactly once or not shown — the same
  refusal rule, for the same reason.
- Because the location is re-derived from the swapped-in
  DOM (never held as an element reference), the display
  survives the swap by construction. That is the property
  the acceptance measures.
- Provenance is a dev-surface affordance and must not leak
  into the built site: it is emitted only on the dev
  server's decorated pages.
- The decisions (what to show, where it goes, whether it can
  be shown at all) are pure functions in `voiceProtocol`-
  style modules and unit-tested; only the DOM application is
  the excluded browser edge.

## Quality Gate

- **Acceptance:** driven in a real browser on port 4130
  against a temp content root (no repository file touched),
  a stubbed `edit_doc` tool call applies an edit; the
  changed passage then shows both its previous and its
  current text in place, and STILL shows them after the
  content swap completes. Screenshot recorded. An edit whose
  replacement text does not locate exactly once shows the
  updated prose with no provenance mark, never a wrong one.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage across all four metrics; no `as`/`any`/
  `ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:design` — self-explanatory UI: an automated
  change must be legible to the person accountable for it.
- `workaholic:implementation` — provenance is derived from
  the edit that was actually applied, not reconstructed by
  the client.
