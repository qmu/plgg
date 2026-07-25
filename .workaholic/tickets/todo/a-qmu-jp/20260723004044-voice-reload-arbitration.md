---
created_at: 2026-07-26T01:13:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Added
depends_on: [20260723004043-voice-edit-doc-tool.md]
mission: plggpress-column-layout-and-voice-ai-editing
---

# Voice 4/4 — hot-reload arbitration: the page updates, the realtime session survives

## Overview

Close the loop the mission's Experience section demands: the
edited page hot-reloads **while the realtime session stays
alive**. Today the injected reload client answers every SSE
frame with `location.reload()`, which destroys the page's JS
context — and with it the `RTCPeerConnection`, the microphone
track, and the conversation. An assistant that drops its own
session every time it edits is not the feature.

So the reload is not suppressed, it is ARBITRATED (PoC 4c's
recorded stance): with no voice session live, a frame reloads
exactly as it does today; with a session live, the frame is
absorbed and the page's content is re-fetched and swapped in
place, leaving the voice panel and the peer connection
untouched.

## Key files

- `packages/plgg-poc4c-livesite/src/reloadPolicy.ts` — the
  proven pure arbitration state machine (`quiet`/`armed`/
  `patched`, `hold`/`reload`) and the reasoning behind each
  branch.
- `packages/plggpress/src/framework/DevServer/model/DevChannel.ts`
  — `LIVE_RELOAD_SCRIPT`, the current unconditional
  `location.reload()`.
- `framework/DevServer/browser/voiceClient.ts` (004042) — owns
  the live session and therefore the arbitration.

## Approach

- Promote the arbitration as a pure, zero-import module
  (`browser/reloadArbiter.ts`) — the same closed
  message/phase algebra as PoC 4c, exhaustively unit-tested
  offline in Node.
- The dev reload client keeps its today behaviour by default;
  when the voice module is loaded it registers as the arbiter,
  so a frame caused by the assistant's own in-flight edit is
  held and answered with an in-place content swap (fetch the
  current URL, replace only the rendered content region), while
  a frame from anything else — the writer editing in their own
  editor — still reloads. The 004020 hot-reload verdict must
  not regress.
- The voice panel lives in its own root element outside the
  swapped region, so a swap never re-creates it.

## Quality Gate

- **Acceptance:** the arbitration module's every
  phase×message transition is asserted. Live: with a voice
  session connected, an `edit_doc` edit updates the rendered
  page in place and the session is STILL connected afterwards
  (verified in a real browser against a running `plggpress
  dev`); with no session, an edit to a watched file still
  reloads the page as before.
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green;
  >90% coverage; no `as`/`any`/`ts-ignore`; Prettier
  `printWidth: 50`.

## Policies

- `workaholic:design` — the writer's conversation is the
  continuity that must not break; the page catching up is the
  subordinate concern.
- `workaholic:implementation` — the arbitration is a pure
  total state machine, not scattered conditionals at the
  edge.
- `workaholic:operation` — the existing hot-reload behaviour
  is a recorded verdict; arbitration must not regress it for
  the no-voice case.
