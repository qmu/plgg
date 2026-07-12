---
created_at: 2026-07-12T11:33:18+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX]
effort: 0.5h
commit_hash: 4fb3f20e
category: Changed
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Resume: PoC 3 live-voice verdict, mintGrant retirement, and ship of PR #64

## Overview

**Carry Origin:** session handoff on `work-20260712-003840` — carried on 2026-07-12 because the token window was filling; continue in a fresh session.

Already done on this branch (do NOT redo): PoC 2 built, judged live, and recorded
**proven** on the portal (grounded cited EN/JA answers, full qmu.co.jp corpus,
script-routed retrieval); PoC 3 (`packages/plgg-poc3-voice`) built and serving at
:5186 / `plgg-poc3.qmu.dev` (cloudflared line applied host-side with developer
approval) with the key-configured container running; plgg-kit migrated to the GA
Realtime API (mint via `client_secrets`, top-level `EphemeralKey`) and verified
with a live mint; the GA session protocol aligned (`session.type` required,
`audio.input.transcription`, `response.output_audio_transcript.done`); the
agent-driven `search_docs` loop proven end-to-end over a headless WebSocket
(model generated 「文書化 基準」 itself and answered grounded Japanese); branch
story committed; **PR #64 open** (https://github.com/qmu/plgg/pull/64), full
check-all green twice, working tree clean. Six tickets archived under
`.workaholic/tickets/archive/work-20260712-003840/`.

Work stopped at: the mission's PoC 3 acceptance gate — the live VOICE judging
(microphone in a real browser) that only the developer can perform. Portal
poc3 honestly shows `building`, verdict `none`.

## Policies

- `workaholic:design` / self-explanatory-ui + security — the portal verdict
  must record honestly what was observed (proven / disproven /
  needs-another-round), and key confinement (ephemeral-only in browser) must
  not regress when retiring the duplicate mint.
- `workaholic:implementation` / objective-documentation — the verdict text
  states measured facts, not aspirations; no `as`/`any`/`ts-ignore`; Prettier
  printWidth 50.
- `workaholic:operation` / command-scripts — reuse `scripts/serve-poc.sh` and
  the portal's `pocConsistent` gate; no bespoke scripts.

## Implementation Steps

1. Ask the developer for the PoC 3 live-voice judging result (they open
   `plgg-poc3.qmu.dev`, Start → allow mic → talk about the open document in
   Japanese; the Agent-driven search trail should show keyword variations).
   If they have not judged yet, this ticket blocks on that — offer to wait.
2. Record the verdict on the portal exactly as PoC 2's verdict ticket did:
   `packages/plgg-poc-portal/src/pocs.ts` poc3 → `proven` (or the honest
   alternative) + verdict text; update the fleet-consistency spec's proven
   set (`Poc.spec.ts`, currently pins `["poc1", "poc2"]`); tick the mission
   acceptance item for the writer-side voice assistant; portal tests + build.
3. Retire PoC 3's local `mintGrant`
   (`packages/plgg-poc3-voice/src/entrypoints/serve.ts`) onto the fixed
   plgg-kit `minterFromConfig`/`realtimeKeyMinter` (endpoint
   `https://api.openai.com/v1/realtime/client_secrets`) — plgg-kit's dist is
   already rebuilt and its minter live-verified; keep the honest 404/502
   contract and the `{value, expiresAt}` wire shape unchanged.
4. Re-run `./scripts/test-plgg-poc3-voice.sh` and a fresh
   `./scripts/check-all.sh`; commit + archive via the drive flow.
5. Ship: `/ship` merges PR #64 (release-note flow runs at ship time).

## Quality Gate

- Portal `pocConsistent` and fleet-consistency spec green after the verdict
  flip; mission acceptance reflects reality.
- poc3 tests green after the mintGrant retirement; a live
  `POST localhost:5186/api/session` still returns 200 `{value: ek_…,
  expiresAt}` through the recreated container (key preserved via
  `podman exec … printenv OPENAI_API_KEY` passthrough recreate).
- check-all green; working tree clean; PR #64 updated by push.

## Findings

- The writer-side (user speech) transcription event name was NOT verifiable
  without real audio. If, during live judging, the conversation works but
  **Writer lines are missing from the Transcript panel**, the first suspect
  is that event name in `packages/plgg-poc3-voice/src/agent.ts` `eventOf`
  (currently `conversation.item.input_audio_transcription.completed`);
  the GA WS endpoint `wss://api.openai.com/v1/realtime?model=gpt-realtime`
  accepts headless probes (see memory `reference_openai_realtime_ga`).
- Container-recreate gotcha: `up --force-recreate` from a keyless shell wipes
  the key; preserve it inline with
  `OPENAI_API_KEY=$(podman exec poc3-voice_poc3-voice_1 printenv OPENAI_API_KEY) podman compose -f workloads/poc3-voice/compose.yaml up -d --force-recreate`.
- `dist/main.js` and index JSONs are read per request (`no-store`), so pure
  bundle changes need only a browser reload; only `serve.ts` changes need a
  container recreate.

## Decisions

- Vocabulary mismatch of exact-term BM25 is accepted by design: production
  agents DRIVE the search with model-generated keyword variations (locked in
  the PoC 2 verdict; demonstrated in PoC 3's trail).
- The duplicate `mintGrant` was a deliberate PoC-first workaround written
  before plgg-kit was fixed on the same branch; retiring it is integration,
  not a bug fix.
- Verdict recording stays a hand-edit of `pocs.ts` guarded by
  `pocConsistent` + specs (the standing portal concern notes this pattern;
  keep the gate mandatory).

## Final Report

Development completed as planned. The developer judged PoC 3 live
(microphone in a real browser at plgg-poc3.qmu.dev) and reported **proven**;
the portal records the verdict, the fleet spec pins poc1–poc3 as the proven
set, the mission acceptance item is ticked, and `serve.ts` now mints through
plgg-kit's `minterFromConfig` — the duplicate local `mintGrant` is deleted.
Verified: portal 12/12, poc3-voice 17/17, live
`POST localhost:5186/api/session` → 200 `{value, expiresAt}` through the
key-preserving container recreate, fresh check-all green.

### Discovered Insights

- **Insight**: The portal container (`poc-portal_poc-portal_1`) bind-mounts
  the MAIN checkout (`/home/ec2-user/projects/plgg`), not the branch
  worktree, so a verdict recorded on a branch appears on the public
  `plgg-poc.qmu.dev` only after the PR merges and main's portal dist is
  rebuilt.
  **Context**: Anyone verifying a verdict flip "live" must curl the
  worktree's own build (or port), not the tunnel hostname — the tunnel
  showing stale data is expected, not a bug.
- **Insight**: plgg-kit's `EphemeralKey` (`{value, expiresAt}`) serializes
  to exactly the wire shape the PoC's hand-rolled `mintGrant` returned, so
  the retirement was a drop-in: the browser client and the 404/502 error
  contract needed no changes.
  **Context**: The PoC-first duplicate was written to the same domain type
  on purpose; keeping PoC seams shaped like the production type is what
  makes later integration a deletion instead of a migration.
