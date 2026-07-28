---
created_at: 2026-07-23T00:40:40+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Changed
depends_on: [20260723004030-live-edit-bridge.md]
mission: plggpress-column-layout-and-voice-ai-editing
---

# Voice-realtime AI assistant "on the same page", editing via the bridge

> **SUPERSEDED (2026-07-26).** This ticket is not driven as a
> unit. Following
> `20260723003900-resume-decompose-voice-realtime.md`, it was
> split into four ordered sub-tickets, each stamped to the same
> mission:
>
> 1. `20260723004041-voice-ephemeral-key-mint.md`
> 2. `20260723004042-voice-dev-browser-client.md`
> 3. `20260723004043-voice-edit-doc-tool.md`
> 4. `20260723004044-voice-reload-arbitration.md`
>
> Its Overview / Key files / Approach / Quality Gate below stay
> as the joint specification the four answer to, and the
> mission's acceptance item still carries THIS filename as its
> marker — it is ticked when all four have landed.

## Overview

Integrate the proven `plgg-poc3-voice` OpenAI Realtime assistant into
production plggpress dev. With `OPENAI_API_KEY` set, `plggpress dev`
shows a voice assistant grounded in the open document's text; the
writer talks to it about the page, and the assistant's tool calls
reach the dev server and edit the local markdown through the live-edit
bridge — the edited page hot-reloading while the realtime websocket
session stays alive. Without the key, dev runs exactly as before (no
assistant).

## Key files

- `packages/plgg-poc3-voice/src/` — the proven Realtime-API assistant
  (client secret mint via `/v1/realtime/client_secrets`, SDP via
  `/v1/realtime/calls`, tool-call loop over the oai-events data
  channel — see the OpenAI Realtime GA notes).
- The live-edit bridge from `20260723004030-live-edit-bridge.md` — the
  assistant's edit tool target.
- The persistent dev-server surface from
  `20260723004020-persistent-dev-server-surface.md` — hosts the
  assistant UI + the client-secret mint endpoint.
- `packages/plggpress/src/framework/Cli/usecase/runApp.ts:372` — the
  `dev` command (read `OPENAI_API_KEY` from env, gate the assistant).

## Approach

- Add an assistant panel to the dev site (dev-only), served over the
  plggpress-owned surface, that mints an ephemeral Realtime client
  secret server-side (never expose `OPENAI_API_KEY` to the browser).
- Ground the assistant in the open page's text; expose an "edit this
  doc" tool whose calls post a patch to the live-edit bridge — reuse
  the bridge, do not add a second edit path.
- The edited page hot-reloads over the plggpress channel while the
  realtime websocket session stays connected.
- Gate strictly on `OPENAI_API_KEY`: absent ⇒ no assistant, dev
  unchanged; the key never reaches production `build`.

## Quality Gate

- **Acceptance:** with `OPENAI_API_KEY` set, `plggpress dev` serves the
  assistant panel and mints a client secret server-side; an
  assistant-issued edit tool call flows through the bridge, edits the
  local doc, and the page hot-reloads while the session stays
  connected. With the key unset, no assistant is served and dev is
  unchanged. The key is never emitted to the client or to `build`
  output. (Realtime network calls are stubbed/mocked in specs; the
  mint + tool-call → bridge wiring is covered.)
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:safety` — the API key stays server-side; only ephemeral
  client secrets reach the browser; the assistant is a dev-only
  surface.
- `workaholic:implementation` — reuse the single edit bridge as the
  assistant's only write path; the assistant is an alternate driver,
  not a parallel editing implementation.

## Final Report

Superseded and now fully delivered by its four sub-tickets, all
archived on this branch:

1. `20260723004041-voice-ephemeral-key-mint.md` — the
   server-side ephemeral Realtime mint (`5da98caa`/`33a420b9`).
2. `20260723004042-voice-dev-browser-client.md` — the dev-only
   browser voice client, grounded server-side in the open
   document (`215dd327`/`336be2d8`).
3. `20260723004043-voice-edit-doc-tool.md` — `edit_doc` routed
   through the EXISTING live-edit bridge
   (`8f1f1bed`/`8fdf6e4f`).
4. `20260723004044-voice-reload-arbitration.md` — the edited
   page updates in place while the session stays alive
   (`b9112409`/`96cac8ab`).

This ticket's own Quality Gate is met end to end: with
`OPENAI_API_KEY` set, `plggpress dev` serves the assistant
panel and mints a client secret server-side; an assistant-issued
`edit_doc` call flows through the bridge, edits the local doc,
and the page updates in place without dropping the page's JS
context; with the key unset no assistant is served and dev is
unchanged; and the standing key appears in no response body and
no `build` output. Realtime network calls are mocked in specs —
the mint and the tool-call → bridge wiring are covered — and the
live verification was done against a real dev server and a real
browser.

### Discovered Insights

- **Insight**: the decomposition was the whole difference.
  **Context**: this ticket was deferred by three consecutive
  autonomous passes as one unit; split into four with an
  ordered `depends_on` chain, each part landed green, live-
  verified, and committed in a single pass. The unit of work
  that an unattended run can close is smaller than the unit a
  developer can specify.
