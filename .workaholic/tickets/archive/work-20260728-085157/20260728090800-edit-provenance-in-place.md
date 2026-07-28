---
created_at: 2026-07-28T09:08:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 2h
commit_hash:
category: Changed
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

## Final Report

Development completed as planned. After a voice edit the
changed passage shows what it was beside what it became,
in place — and keeps showing it across the in-place swap.

- `browser/voiceProtocol.ts` — `Provenance {was, now}` and
  `provenanceOf(applied, find, replace)`: a record only for
  an edit the bridge answered `applied` to, and none for a
  deletion (there is no passage left to annotate).
  `exactlyOnceAt` applies the same exactly-once rule the
  highlight and the bridge obey.
- `browser/voiceClient.ts` — `runEditTool` appends the
  provenance of each applied edit; `showChange` finds the
  passage as it NOW reads in the page's own text and wraps
  it as `<del>was</del><ins>now</ins>`; `swapContent`
  re-paints every change after the swap.

**Why it survives the swap.** The location is re-derived
from whatever is in the DOM at the time, never held as an
element reference — the same discipline `focused` already
follows. The swap destroys the marks and the re-derivation
puts them back, which is a property of the design rather
than of bookkeeping.

**The duplication, and how it is contained.**
`voiceProtocol.ts` is import-free by construction (a
browser has no resolver for a bare `plgg` specifier), so
its exactly-once rule is spelled a second time.
`voiceProtocol.spec.ts` now pins it against
`Locate/usecase/locateOnce` over a table of cases — where
both CAN be imported — so the two cannot drift apart
silently. That is the same containment the file's
`RELOAD_HOOK_NAME` duplication already uses.

Verified live in a real browser against a `plggpress dev`
on port 4131 over a TEMP content root (no repository file
touched), driving the SERVED modules directly:

```
POST /__plggpress_patch  {"path":"index.md","edits":[…]}
  200  {"path":"index.md","applied":true}
  provenanceOf → [{was:"The original sentence lives here",
                   now:"The rewritten sentence lives here"}]
after swapContent()
  mark shown   del "The original sentence lives here"
               ins "The rewritten sentence lives here"
after a SECOND swapContent()
  marks right after the swap: 0
  re-derived from the new DOM: shown again, same text
a replacement that is not on the page: shown = false,
  and no wrong mark appears
```

Screenshot: `strip-t9-edit-provenance.png`.

### Discovered Insights

- **Insight**: the client does not need the bridge to
  report the applied ops back.
  **Context**: the client sent the `{find, replace}` and
  the bridge answered `applied: true` for exactly that op —
  so using it is a record of the write, not a guess. This
  avoided widening the bridge's response shape, and with
  it the dev surface, for no gain.
- **Limitation**: provenance is a LIVE-session affordance.
  It lives in the client's module state, so a full page
  reload clears it — and a reload is what happens when no
  session is open. That is honest (there is no assistant to
  attribute a change to on a fresh page) but it is a
  boundary worth knowing.
