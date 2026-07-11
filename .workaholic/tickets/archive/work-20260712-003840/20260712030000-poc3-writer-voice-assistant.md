---
created_at: 2026-07-12T03:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash: d34ee9e1
category: Added
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# PoC 3 — writer-side voice assistant (Realtime API, agent-DRIVEN search tool-calling)

## Overview

Build PoC 3 of the plggpress confidence fleet: the **writer-side interactive
voice assistant** over the OpenAI Realtime API, "on the same page" with the
open document. Reserved on the portal as poc3 (`plgg-poc3.qmu.dev`, port
**5186**, `status: "planned"`). New package `packages/plgg-poc3-voice`
(keep the `plgg-poc<N>-<slug>` convention; name final at scaffold).

**Confidence signal (mission):** a voice conversation about the currently
open document works end-to-end in the browser against the server-minted
session, with the document content in the assistant's context.

## Decision locked (developer, 2026-07-12, PoC 2 live judging)

**The agent DRIVES the search.** The Realtime session is given a
`search_docs` function tool backed by the browser-local FTS (PoC 2's shipped
index); the model calls it REPEATEDLY, generating its own keyword variations
until they match the corpus vocabulary. The reader/writer's phrasing never
needs to hit the index directly — this is the accepted resolution of PoC 2's
measured exact-term vocabulary-mismatch limit (ドキュメンテーション vs
文書化), and demonstrating that loop working is part of THIS PoC's proof.
Render the tool-call trail (each keyword set tried + its hits) so the
developer can watch the agent search.

## Key Files (templates verified in this repo)

- `packages/plgg-cms/src/agent/realtimeBackend.ts` + `packages/plgg-kit`
  (`mintRealtimeKey`, `EphemeralKey`) — the ephemeral-key mint the server
  seam reuses: the standing `OPENAI_API_KEY` stays in the serve process,
  the browser gets only a short-lived key (honest 404 + upfront banner when
  keyless — the PoC 2 `/api/health` pattern).
- `packages/plgg-cms/src/agent/voiceAgent.ts` — the TEA lifecycle reducer
  template (idle → connecting → listening → searching → answering, guarded
  transitions, pure and unit-testable) and its coverage-excluded IO seam
  split.
- `packages/plgg-poc2-agent/` — the scaffold to mirror: relative reuse seam
  onto PoC 1's FTS (`src/poc1.ts`), dual EN/JA index build (full qmu.co.jp
  corpus with vendored fallback), serve entry recipe, workload compose with
  `OPENAI_API_KEY` passthrough, no-store headers.
- `packages/plgg-poc-portal/src/pocs.ts` — flip poc3 `building` while
  serving; verdict after live judging. Fleet-consistency spec pins the
  proven set — update alongside.

## Implementation Steps (outline — refine at drive time)

1. Scaffold `packages/plgg-poc3-voice` with the full package set + fleet
   wiring (npm-install/check-all/test script/README index/workload at host
   5186 → container 5173).
2. Server seam: `GET /api/health` + `POST /api/session` minting the
   ephemeral Realtime key from host env.
3. Browser: open the Realtime connection (WebRTC audio in/out) with the
   ephemeral key; register the `search_docs` tool (query keywords in, top-k
   chunks out) over the shipped EN/JA indexes; feed tool results back into
   the session; session instructions carry the OPEN DOCUMENT (a visible
   document pane on the page) so the conversation is "on the same page".
4. UI: document pane + conversation transcript + the tool-call trail
   (keywords tried → hits → what the assistant said), PoC design language.
5. Offline smoke: pure reducer specs (voiceAgent-style) + tool dispatch
   specs with a fake session seam; no network in tests.
6. Portal poc3 → `building`; live judging then verdict.

## Quality Gate

- `scripts/test-plgg-poc3-voice.sh` green (typecheck + offline smoke).
- Live at `plgg-poc3.qmu.dev`: a spoken Japanese or English question about
  the open document gets a spoken, grounded answer; the visible tool-call
  trail shows the agent trying keyword variations against the FTS.
- Standing key never reaches the browser (ephemeral mint only); keyless =
  honest 404 + banner.
- No `as`/`any`/`ts-ignore`; Prettier printWidth 50; fleet wiring complete
  at scaffold (the PoC 2 lesson list).

## Considerations

- Realtime API cannot be exercised offline — the smoke bar covers the
  reducer/tool dispatch; the voice loop itself is judged live (as PoC 2's
  model calls were).
- Cloudflared line `plgg-poc3.qmu.dev → :5186` is developer-applied (or ask
  the agent, per this session's precedent).
- This is a large greenfield PoC — expect its own full drive session.
