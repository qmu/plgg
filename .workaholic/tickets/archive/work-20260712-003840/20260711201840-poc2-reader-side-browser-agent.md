---
created_at: 2026-07-11T20:18:40+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash: 2449b09d
category: Added
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# PoC 2 — reader-side embedded browser agent (grounded, cited answers via a dev-server session seam)

## Overview

**Ticket C** of the three follow-ups carried in the resumption ticket
`20260711131543-resume-poc-fleet-ci-fix-and-next-tickets.md` (developer + agent
agreed this session; decisions locked — do not relitigate). Build PoC 2 of the
plggpress confidence fleet: a **reader-side browser agent** that answers a
reader's questions about the corpus, **grounded in the shipped document index
and citing its sources**, with the LLM key never reaching the browser or the
repo.

This is the "Reader-side embedded browser agent" PoC already reserved in the
portal (`packages/plgg-poc-portal/src/pocs.ts` poc2: `plgg-poc2.qmu.dev`,
port **5185**, currently `status: "planned"`). New package
`packages/plgg-poc2-agent/` (name TBD at scaffold; keep the `plgg-poc<N>-<slug>`
convention).

**Confidence signal (what counts as proven):** every answer cites its retrieved
chunks (heading-path links into the site); a ~10-question canned set renders
answers **side-by-side with their retrieved evidence** so the developer judges
grounding quality live in a browser — the same "proof = citations + canned set"
bar PoC 1 used.

## Decisions locked (from the resumption ticket, Decision 3)

1. **Grounding proof = citations + canned set** (like PoC 1). Every answer must
   cite the chunks it used (heading-path links); a ~10-question canned set shows
   answers next to their retrieved evidence.
2. **LLM access = dev-server session seam.** A tiny server endpoint in the PoC
   workload holds `OPENAI_API_KEY` from the host env and mints a short-lived
   session / proxies the chat call; **no key ever reaches the browser or the
   repo.** This mirrors the surviving `agentWeb.ts` `/api/agent/session`
   pattern. **Therefore PoC 2 is NOT a static-only bundle** (unlike PoC 1) — it
   needs the server seam. Allocate `plgg-poc2.qmu.dev` → :5185 (already reserved
   in the portal map).
3. **Grounding tool = reuse PoC 1's proven FTS arm** (`packages/plgg-poc1-search/
   src/search/fts.ts` BM25 over a shipped inverted index) as the pure,
   zero-network retrieval tool. Answer via **plgg-kit `generateObject`**;
   TEA reducer templated on `voiceAgent.ts`; **citation formatting is
   greenfield** (the voice agent's was minimal hit-prefixing).

## Key Files (verified this session)

- `packages/plgg-poc-portal/src/pocs.ts` — poc2 entry; on completion flip
  `status` (`building` while serving, then `proven`/verdict) exactly as Tickets
  A/B did. Keep `pocConsistent` green.
- `packages/plgg-kit/src/LLMs/usecase/generateObject.ts` — the answer engine:
  `generateObject({ provider, ... }): PromisedResult<unknown, unknown>`,
  OpenAI **Responses API** structured output; key from the provider `Option`
  or env fallback (`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`).
  Structured JSON out — NOT a tool-calling loop.
  - `packages/plgg-kit/src/LLMs/vendor/OpenAI.ts`,
    `.../model/Provider.ts` — provider shape + dispatch.
  - plgg-kit tests inject a fake `post` (`typeof postJson`) — reuse that seam
    for an offline PoC smoke suite (no network in tests).
- `packages/plgg-cms/src/agent/voiceAgent.ts` — the **TEA template** for the
  chat reducer (pure: question → Search cmd → grounded answer → render). Swap
  the injected `browserVoiceIo` effect seam for a **text-chat + generateObject**
  seam.
- `packages/plgg-cms/src/agent/agentWeb.ts` — the **server session-seam
  template**: `/api/agent/session` mounts, session-subject via `RpSessionStore`
  + cookie (`RP_SESSION_COOKIE`); 404s when no key. `EphemeralKey` type +
  `packages/plgg-cms/src/agent/realtimeBackend.ts` are the mint/contract
  reference (NOTE: the resume ticket's `mintRealtimeKey.ts`/`EphemeralKey.ts`
  paths were stale — the code lives in `realtimeBackend.ts`).
- `packages/plgg-poc1-search/src/search/fts.ts` + `indexer/buildFts.ts` — the
  grounding tool + index shape to reuse. `chunkMarkdown` (`indexer/chunk.ts`)
  builds heading-path chunks the citations link to.
- Reference workloads: `workloads/poc1-search/compose.yaml` (mount-the-repo,
  host-built artifacts) — but PoC 2 additionally needs a **server process**
  (not just a static file server), so its serve entry runs the API + serves the
  bundle. `scripts/serve-poc.sh` is the canonical runner.

## Policies

- `workaholic:design` / security + data-sovereignty — the key stays server-side
  (session seam), never in the bundle or browser. **Sovereignty note to state
  honestly either way:** a reader's query text inherently leaves the device for
  the provider on each answer (unlike PoC 1's fully-local FTS). Say so on the
  page.
- `workaholic:implementation` / vendor-boundary — provider/network code behind
  a `vendors/` seam; the domain sees only the answer/grounding seams. No
  `as`/`any`/`ts-ignore`; Option/Result; Prettier printWidth 50.
- `workaholic:operation` / ci-cd + command-scripts — at scaffold time add the
  new package to `scripts/npm-install.sh`, `check-all.sh`, a `test-*.sh`,
  `README.md` index, and a `workloads/<name>/compose.yaml` (the lesson the
  CI-fix ticket encoded). Ship `serve.ts` with `Cache-Control: no-store` (the
  dev-preview caching fix from Ticket B).
- `.prettierrc.json` (printWidth 50) at creation — the scaffold gap Tickets A/B
  had to backfill.

## Implementation Steps (outline — refine at drive time)

1. Scaffold `packages/plgg-poc2-agent/` with the full package set (tsconfig
   rootDir src, `.prettierrc.json`, README, package.json, plgg-bundle app +
   a node server entry). Wire into npm-install/check-all/test/README/workload.
2. **Server seam:** a small API (templated on `agentWeb.ts`) exposing a chat/
   answer endpoint that reads `OPENAI_API_KEY` from host env and calls
   `generateObject` server-side (or mints a short-lived session), returning the
   structured answer + citations. 404/honest-empty when no key. Never expose
   the key.
3. **Grounding tool:** reuse PoC 1's `fts.ts`/`buildFts.ts` to build+query an
   index over the corpus (decide corpus at drive: the plgg guide like PoC 1,
   and/or the vendored JA corpus so it inherits Ticket B's Segmenter tokenizer).
   Retrieval returns chunks (heading-path + text) as the grounding evidence.
4. **Agent reducer:** a TEA program templated on `voiceAgent.ts` — question →
   retrieve (FTS) → `generateObject` with retrieved chunks as context →
   answer + citations → render. Text chat, not voice; not a tool-calling loop.
5. **Citations (greenfield):** every answer links each claim/source to its
   chunk's heading-path (a link into the site/section). Design the citation
   format.
6. **Canned set + side-by-side proof:** ~10 questions rendering answer next to
   its retrieved evidence, for the developer's live grounding judgement. Reuse
   the panel/card design language from PoC 1's redesign for consistency.
7. Serve at :5185 (`plgg-poc2.qmu.dev`), `Cache-Control: no-store`.

## Quality Gate

**Acceptance criteria:**
- New package builds and serves at :5185; `plgg-poc2.qmu.dev` reachable.
- Answers are **grounded and cited**: each answer links its retrieved chunks
  (heading-path into the corpus); the ~10-question canned set renders answers
  side-by-side with their evidence.
- **The LLM key never reaches the browser or the repo** — verify the shipped
  bundle contains no key and the browser makes no direct provider call (all
  provider traffic goes through the server seam).
- Offline smoke suite passes by injecting a fake `post` (no network in tests);
  `tsc --noEmit && plgg-test src` green; no `as`/`any`/`ts-ignore`; no new bare
  import outside `vendors/`/`entrypoints/`.
- Package joins `npm-install.sh`, `check-all.sh`, `test-*.sh`, `README` index,
  a `workloads/` compose; has `.prettierrc.json`; `serve.ts` sends `no-store`.
- Portal poc2 record updated (status + verdict) with `pocConsistent` green.

**Verification method:**
- `./scripts/test-plgg-poc2-agent.sh` green (typecheck + offline smoke).
- Developer judges the canned side-by-side grounded answers live in a browser
  at `plgg-poc2.qmu.dev` (the confidence signal).
- Key-safety check: grep the shipped bundle for the key / provider host; confirm
  the browser's network calls hit only the local server seam.

**Gate:** offline smoke + typecheck green AND the developer accepts the live
grounded/cited answers, before approval; key-in-bundle check must be clean.

## Considerations

- **CRITICAL TENSION (from the resume ticket):** the session-seam needs a
  server, but PoC 1 shipped as a static bundle. PoC 2 deliberately adds the
  tiny server seam — do not try to keep it static-only.
- `plgg-fetch` is NOT used by plgg-kit (`postJson` direct) and has no
  streaming/AbortSignal, so it adds nothing for a single non-streaming
  completion; don't pull it in.
- Corpus choice (guide EN vs the Ticket-B JA corpus vs both) is a drive-time
  decision — pick one that makes the grounding/citation quality legible.
- This is a **large** greenfield PoC — expect it to be its own full drive
  session, not a quick change.
- Completing PoC 2 is the mission's next acceptance milestone after PoC 1.
