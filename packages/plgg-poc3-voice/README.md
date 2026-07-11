# plgg-poc3-voice

> PoC 3 of the plggpress confidence-collection fleet for the
> [plgg monorepo](../../README.md) — the **writer-side voice assistant** over
> the OpenAI Realtime API, "on the same page" with the open document,
> grounding itself by **driving the browser-local full-text search** through
> repeated keyword tool calls.
> Portal: [plgg-poc-portal](../plgg-poc-portal/README.md) /
> `https://plgg-poc.qmu.dev/`.

The plggpress vision gives the writer an interactive voice assistant on the
dev server. This PoC collects confidence in the two risky parts at once:

- **The voice loop.** `POST /api/session` mints a short-lived Realtime key
  (plgg-kit's `realtimeKeyMinter`; the standing `OPENAI_API_KEY` stays in
  the serve process — an honest 404 + upfront banner without it). The
  browser opens WebRTC with only that ephemeral grant: microphone in, audio
  out, the `oai-events` data channel for events (`src/vendors/realtime.ts`,
  templated on plgg-cms's `realtimeBackend`). The session instructions carry
  the **open document** (picked on the page), so the conversation is
  literally on the same page.
- **Agent-DRIVEN search (the PoC 2 verdict's accepted design).** The session
  exposes one `search_docs` function tool backed by PoC 1's BM25 over the
  shipped indexes (EN guide + full qmu.co.jp JA articles, script-routed).
  The model calls it repeatedly, generating its own keyword variations until
  the corpus vocabulary matches — the writer's phrasing never needs to hit
  the exact-term index. The page renders the **tool-call trail** (every
  keyword set tried, which corpus, what it hit), so the developer can watch
  the loop work; a miss returns a worded nudge to try other keywords, never
  a silent empty.

The pure heart (`src/agent.ts` — event decoder, tool executor, instruction
assembly) plus the TEA reducer are unit-tested offline; only
`src/vendors/realtime.ts` touches WebRTC/mic and is judged live.

## Commands

- `npm run build` — bundle the client (`build:app`), then build the indexes
  (`build:index`; prefers the full `~/projects/qmu-co-jp/docs` checkout,
  falls back to PoC 1's vendored pages — the PoC 2 recipe).
- `npm run serve` — serve page/bundle/indexes **and the mint seam** on
  `PORT` (default 5173). Export `OPENAI_API_KEY` first for live sessions.
- `npm run test` — strict typecheck + the offline smoke specs (Realtime
  event decoding, tool routing/execution, instruction assembly, the session
  lifecycle reducer, the mint-grant caster).

From the repo root: `OPENAI_API_KEY=… scripts/serve-poc.sh poc3-voice`
(host port **5186** → container 5173; tunnel route `plgg-poc3.qmu.dev`).

## Sovereignty note

Stated honestly on the page itself: **the writer's voice streams to
OpenAI's Realtime API over WebRTC**, authorized by the short-lived key —
that is the product's deliberate trade for a live voice partner. Document
retrieval stays fully local (the shipped index, searched in the browser);
the standing key never reaches the browser or the repo.

## Status vocabulary

The verdict is recorded on the portal's PoC 3 record
(`../plgg-poc-portal/src/pocs.ts`, currently `building`) after the
developer judges a live voice conversation — including watching the
agent-driven search trail resolve a vocabulary-mismatched question — in a
real browser.
