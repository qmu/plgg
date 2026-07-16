---
created_at: 2026-07-16T16:49:19+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Infrastructure]
effort: 4h
commit_hash:
depends_on: 20260716164916-integration-1-browser-fts-core.md
category: Added
mission: plggpress-technical-confidence-poc-portal
---

# Integration 4/8: writer dev-mode voice assistant "on the same page"

## Overview

Fourth ticket of the post-PoC integration chain (see the mission's
`integration-plan.md`). `plggpress dev` gains the PoC 3-proven writer loop:
a Realtime voice session carrying the open document in its instructions, with
the agent DRIVING `search_docs` over the `plgg-search` core (repeated
model-generated keyword variations, on-page tool-call trail). Reuse the
production ephemeral-key mint seam (`plgg-cms/src/agent/agentWeb.ts` +
plgg-kit `KeyMinter`) — do not re-port PoC 3's `/api/session`.

## DECISION NEEDED (developer) — do not guess

Production already has a voice agent in `plgg-cms/src/agent` (TEA reducer,
WebRTC seam, ONE server-side RAG tool, admin/auth wiring). Reconcile: extend
it with the PoC's browser-driven-search shape, or bring the PoC shape in
beside it? And does writer-mode agent code live in plggpress (which owns
`dev`) or in plgg-cms with plggpress consuming it?

## Quality Gate

- A `plggpress dev` session discusses the open document over voice; every
  factual answer grounded via visible `search_docs` tool calls.
- Key confinement: standing key server-side only; the browser holds the
  short-lived grant.
- check-all green; pure parts >90% covered; the WebRTC/mic seam stays a
  coverage-excluded vendor file per the plgg-cms precedent.

## Policies

- `workaholic:design` / `policies/security.md` — key confinement as PoC 3
  proved it (mint seam, honest 404 without a key).
- `workaholic:implementation` / `policies/anti-corruption-structure.md` — one
  Realtime vendor seam, not two: reconcile with `realtimeBackend.ts` rather
  than duplicating a browser WebRTC wrapper.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; Prettier printWidth 50.
