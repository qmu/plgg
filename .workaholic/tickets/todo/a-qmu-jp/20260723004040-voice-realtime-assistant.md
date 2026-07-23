---
created_at: 2026-07-23T00:40:40+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Added
depends_on: [20260723004030-live-edit-bridge.md]
mission: plggpress-column-layout-and-voice-ai-editing
---

# Voice-realtime AI assistant "on the same page", editing via the bridge

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
