---
created_at: 2026-07-28T09:09:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Infrastructure]
effort: 2h
commit_hash:
category: Changed
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

## Final Report

Development completed as planned. Saying it now works
exactly like clicking it — because it IS clicking it.

- `usecase/voiceInstructions.ts` — `openColumnToolOf(routes)`
  builds the `open_column` schema with the site's own routes
  as an **enum**, so the model SELECTS a page rather than
  naming one; `voiceToolsOf(doc, routes)` offers it beside
  the document verbs, and only when there are routes to
  offer. `columnProtocol` tells the model that a column
  opens to the right, that nothing reloads, and that a
  quotation it cannot copy verbatim marks nothing.
- `browser/voiceProtocol.ts` — decodes an `open_column`
  frame into `ColumnRequested`, refusing an empty route
  before it can reach the runtime as a navigation to the
  current page; `columnAnswerOf` reports a refusal as a
  reason the model can act on.
- `browser/voiceClient.ts` — `openColumnNow` resolves the
  FRAMEWORK hook and calls its `open`. That is all it does.
- `model/VoiceProtocol.ts` — `NAV_HOOK_SCRIPT`, built from
  plggmatic's own `navHookName` (imported, not typed), so
  the browser finds the hook without plggpress ever spelling
  a framework name in its own JavaScript. A spec pins the
  global's name across the two sides of the wire.

Verified live in a real browser on port 4130 against a
voice-enabled dev server, driving the SERVED modules:

```
two decoded open_column frames
  ColumnRequested:/getting-started
  ColumnRequested:/packages/plgg/
SAID     /concepts/ | /getting-started | /packages/plgg/
         url /concepts/?c=/getting-started,/packages/plgg/
CLICKED  /concepts/ | /getting-started | /packages/plgg/
         url /concepts/?c=/getting-started,/packages/plgg/
identical: true          navigations 1     sentinel alive

with a live RTCPeerConnection open on the page:
  before  connected/connecting
  after   connected/open      (across BOTH column opens)
```

The realtime session is not merely undisturbed — its data
channel finished opening while the strip grew, which is
only possible because nothing navigated the browser away.
Screenshot: `strip-t10-assistant-drove-it.png`.

**The grep proof.** The voice client contains no
column-navigation logic: no `pushState`, no
`location.assign`, no column placement. Its only history
and DOM-surgery uses are the pre-existing ones —
`replaceState` for `focus_section`'s fragment, and
`swapContent`'s hot-reload swap. Every column it opens goes
through `NAV_HOOK_GLOBAL`.

### Discovered Insights

- **Insight**: an `enum` of the site's routes is a stronger
  containment than any validation.
  **Context**: the model is not asked for a route and then
  checked; it is only ever offered the routes that exist.
  A prompt-injected "open /etc/passwd" has no argument
  value to land in.
- **Insight**: a loopback `RTCPeerConnection` is a real,
  key-free stand-in for the realtime session.
  **Context**: it makes "the session survives" measurable
  in a browser without a microphone, a key, or a live
  model — the same substitution the `edit_doc` ticket made
  for the tool-call loop.
