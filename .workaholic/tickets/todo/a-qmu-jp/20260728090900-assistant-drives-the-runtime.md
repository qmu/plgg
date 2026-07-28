---
created_at: 2026-07-28T09:09:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Infrastructure]
effort: 2h
commit_hash:
category: Added
depends_on: [20260728090800-edit-provenance-in-place.md]
mission: make-the-column-strip-a-real-navigation-surface
---

# Strip 10/11 — saying it works like clicking it: the assistant drives the SAME runtime, and the session survives

## Overview

"Take me to Core, then Values and Effects" must open those
columns exactly as the two clicks would, leaving the strip
in the same state either way — and the realtime session must
still be alive at the end of it, because nothing navigated
the browser away.

The whole point is that this is **not** a parallel dev-only
path. The assistant calls the same `open` the pointer calls.
If it needed its own navigation code, the mission's layering
claim would be false.

## Key files

- `packages/plggmatic/src/Navigate/usecase/navigationScript.ts`
  — the `navHookName` entry point from ticket 2; the
  assistant's only navigation surface.
- `packages/plggpress/src/framework/DevServer/usecase/voiceInstructions.ts`
  — where tool schemas and instructions are assembled
  server-side (`EDIT_DOC_TOOL`, `focus_section`); the new
  tool joins them.
- `packages/plggpress/src/framework/DevServer/browser/voiceProtocol.ts`
  — decodes `response.function_call_arguments.done` frames
  into typed events; the pure half of the new tool.
- `packages/plggpress/src/framework/DevServer/browser/voiceClient.ts`
  — `onFrame` dispatch, `replyToTool`; where the decoded
  event becomes a call into the framework runtime.

## Approach

- An `open_column` tool: a route (validated against the
  site's own routes server-side at mint time, so the model
  cannot name a route that does not exist) and an optional
  verbatim span. Its decode, its refusal shapes, and the
  tool output it reports are pure and unit-tested, following
  `edit_doc`'s precedent exactly.
- The browser edge calls `window[navHookName].open(...)` —
  the ticket-2 hook, nothing else. The assistant therefore
  inherits the placement, the composition URL, the highlight
  refusal and the `popstate` behaviour for free; a
  divergence between "said" and "clicked" would require
  someone to add a second code path, which is the thing this
  ticket forbids.
- The refusal path matters as much as the success path: an
  unroutable target or an unlocatable span comes back to the
  model as a reportable reason, so it can ask rather than
  fall silent.
- Multi-step ("then …") is just two calls; the strip after
  them must be byte-identical to the strip after the two
  equivalent clicks. That equality is the acceptance.

## Quality Gate

- **Acceptance:** in a real browser on port 4130 with a live
  session open (or a stubbed tool-call frame fed to the
  served `voiceProtocol` module, the technique the
  `edit_doc` ticket established): two `open_column` calls
  produce a strip and a URL **identical** to the strip and
  URL produced by the two equivalent clicks, compared
  literally; and the realtime session is still open
  afterwards (`RTCPeerConnection.connectionState` still
  `connected`, or — in the stubbed run — the page's JS
  context demonstrably never reloaded). Screenshot recorded.
- Grep proof that the voice client contains no navigation
  logic of its own: the only navigation it performs is
  through `navHookName`.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage across all four metrics; no `as`/`any`/
  `ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:implementation` — one navigation path, several
  drivers. The assistant is an alternate driver, never a
  second implementation.
- `workaholic:safety` — the model selects among the site's
  own routes; it cannot compose an arbitrary URL for the
  reader's browser to follow.
