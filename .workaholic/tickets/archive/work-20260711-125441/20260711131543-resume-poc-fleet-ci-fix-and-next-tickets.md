---
created_at: 2026-07-11T13:15:43+09:00
author: a@qmu.jp
type: bugfix
layer: [Config]
effort:
commit_hash: 170362c8
category: Changed
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Resume: fix red-main CI (npm-install.sh misses the two PoC packages), then file the next mission tickets

## Overview

**Carry Origin:** session handoff on `work-20260711-125441` — carried on 2026-07-11 because the token window was filling; continue in a fresh session.

Mission `plggpress-technical-confidence-poc-portal` is at **3/9** acceptance. PRs #61 (prior branch) and #62 (the PoC portal + PoC 1) are merged to `main`; the guide deploys fine. **But the `Run Tests` fresh-clone CI backstop is RED on `main`** as of merge `c95e8028` (PR #62), and that is the priority this ticket fixes. This branch (`work-20260711-125441`) was created off up-to-date `main` for the remaining mission work and has **no commits of its own yet** (HEAD = `696b18d6`, the post-merge evidence commit on main). Working tree is clean.

**Root cause (verified from CI log, run 29137766727):** `packages/plgg-poc-portal`'s test step fails with `error TS2688: Cannot find type definition file for 'node'`. `scripts/npm-install.sh` is a hand-maintained per-package `npm install` loop, and the two new PoC packages (`plgg-poc-portal`, `plgg-poc1-search`) were never added to it. CI does a clean clone → those packages get no `node_modules` → no `@types/node` → `tsc` cannot resolve `"types": ["node"]`. It passed locally only because `npm install` was run in each package by hand (their `node_modules` are gitignored, so the masking is invisible to a warm local `check-all` — exactly the "only clean-runner CI catches this" failure mode). `plgg-poc1-search` is also absent from the list and will fail the same way once the portal is fixed (it additionally needs `@huggingface/transformers` resolved for its `src/vendors/*` typecheck).

Work stopped **before writing any code** — the session was in characterization/ticketing when carry was invoked.

## Policies

- `workaholic:implementation` / `policies/command-scripts.md` — `npm-install.sh` is a canonical repo runner; keep the per-package install loop the single source, ordered by dependency.
- `workaholic:operation` / `policies/ci-cd.md` — the fresh-clone `Run Tests` workflow is the merge-gate backstop; a new package must join the install loop or it fails the clean run. Local and CI paths must not drift.
- `workaholic:implementation` / `policies/directory-structure.md` — package layout convention (the two PoC packages are standard `packages/<name>/` leaves).
- `workaholic:implementation` / `policies/coding-standards.md` — POSIX sh style matching the existing script.

## Implementation Steps

1. Edit `scripts/npm-install.sh`: add `cd $REPO_ROOT/packages/plgg-poc-portal && npm install` and `cd $REPO_ROOT/packages/plgg-poc1-search && npm install` to the install loop. Place them **after** `packages/example` and **before** `packages/guide` (both PoC packages only `file:`-depend on packages installed earlier in the loop: plgg, plgg-view, plgg-server [portal], plgg-router [poc1], plgg-bundle, plgg-test — all above `example`). A short comment noting they are the private PoC-fleet apps is in keeping with the file's style.
2. Verify locally the clean-clone path this fixes: from a scratch dir, `git clone` (or `git worktree add`) the branch, run `./scripts/npm-install.sh`, then run `npm run test` (`tsc --noEmit && plgg-test src`) in **both** `packages/plgg-poc-portal` and `packages/plgg-poc1-search` — both must pass with `@types/node` resolved. (A full `./scripts/check-all.sh` in the clean checkout is the strongest proof but slow; the two package typechecks are the targeted proof of THIS fix.)
3. Do NOT tear down or rebuild the live guide preview container on :5181 or the two PoC containers (:5183/:5184) to run a warm local check-all — they share dist; schedule any full check-all around them or run it in the clean checkout from step 2.
4. Commit via the drive archive flow. After it lands and the branch PR's `Run Tests` goes green, `main` is healthy again on the next merge.

## Quality Gate

**Acceptance criteria:**
- `scripts/npm-install.sh` includes both `plgg-poc-portal` and `plgg-poc1-search`, dependency-ordered.
- In a **fresh clone/worktree**, after `./scripts/npm-install.sh`, `tsc --noEmit && plgg-test src` passes in both PoC packages (no TS2688).
- The branch PR's `Run Tests` GitHub Actions check is **green** (the authoritative gate — this is the fresh-clone backstop the local run masked).

**Verification method:**
- `gh run list --repo qmu/plgg --workflow=run-tests.yml` shows success for this branch's PR head SHA; or `gh run view <id> --log-failed` is empty.
- Clean-checkout reproduction from step 2.

**Gate:** `Run Tests` green on the PR before merge; no product-code change (script-only).

## Findings

- **The masking is structural, not incidental** (verified against CI run 29137766727 and `scripts/npm-install.sh`): `node_modules/` is gitignored, `npm-install.sh` is a manual list, and `check-all.sh` never runs `npm install` — it assumes deps are present. So any new package that isn't added to `npm-install.sh` passes every warm local run and only fails the hosted fresh-clone `Run Tests`. The general lesson for the coming PoC packages (PoC 2+): **add each new package to `npm-install.sh` at scaffold time**, same as it must be added to `README.md`, `check-all.sh`, and its `test-*.sh`.
- `Deploy Guide` for merge `c95e8028` **succeeded** (run 29137713974) and the release `2026.07.week2.release2` published — production is unaffected; only the merge-gate inspection is red. This is a backstop-red, not a live-site incident.
- **PoC 1 verdict is settled (developer + agent agreed) but NOT yet recorded** — see Decisions. Recording it flips mission acceptance item 3's intent (already ticked as "measured"; the verdict text is the substance).
- **PoC 2 discovery already ran this session** (agent `discover-poc2-source`; its JSON was in session-local scratchpad and is GONE in a fresh session — the load-bearing facts are preserved here so PoC 2 need not re-discover):
  - `plgg-kit` is **browser-runnable**: zero node builtins, calls providers over native `fetch` via plgg's `postJson`; `env()` returns `Err` safely when `process` is undefined. `generateObject` (OpenAI **Responses API** structured output at `/v1/responses`, provider-dispatched, key from the provider `Option` or env fallback) runs in a browser given a key on the provider. Structured JSON out — **not** a function/tool-calling loop. Key files: `packages/plgg-kit/src/LLMs/usecase/generateObject.ts`, `.../vendor/OpenAI.ts`, `.../model/Provider.ts`.
  - The prior realtime **voice agent** (archived ticket `work-20260704-130317/20260704143025-realtime-voice-agent.md`) **survives intact** in `packages/plgg-cms/src/agent/` + `packages/plgg-kit/src/LLMs/`. The browser NEVER received the standing key: a server-side `mintRealtimeKey.ts` → OpenAI `realtime/sessions` minted a short-lived ephemeral `client_secret`, handed out by `POST /api/agent/session` (`plgg-cms/src/agent/agentWeb.ts`, 404 when no key). `EphemeralKey.ts` is the contract.
  - `packages/plgg-cms/src/agent/voiceAgent.ts` is a **direct TEA template** for PoC 2's chat agent (pure reducer: question → Search cmd → grounded answer → render; swap the injected `browserVoiceIo` effect seam for a text-chat + `generateObject` seam). Answer/citation formatting there was minimal (hit-prefixing) — **citation formatting for PoC 2 is greenfield**.
  - Retrieval-then-answer server code (`semanticSearch.ts`/`ragSearch.ts`) **stops at retrieval** (returns hit ids/`SearchHit`); there is no existing server-side "answer-with-citations". PoC 2 reuses **PoC 1's** `packages/plgg-poc1-search/src/search/fts.ts` (the proven BM25 arm) as the pure, zero-network grounding tool, then feeds hits to `generateObject`.
  - **CRITICAL TENSION for PoC 2:** the ephemeral-mint pattern needs a **server**, but PoC 1 ships as a static self-contained bundle (`bundle.config.ts` target `"app"`, no server). A purely static site cannot honor "no standing key in the bundle." So PoC 2 must add a tiny server seam — which the developer already chose (see Decisions).
  - `plgg-fetch` is NOT used by `plgg-kit` (`postJson` direct) and has no streaming/AbortSignal, so it adds nothing for a single non-streaming completion. `plgg-kit` tests inject a fake `post` (`typeof postJson`) — reuse that seam for an offline PoC smoke suite.

## Decisions

Decisions made with the developer this session (do not relitigate). These drive the **next three tickets to file after this CI fix lands** (file them via `/ticket`, tagged `mission: plggpress-technical-confidence-poc-portal`):

1. **Ticket A — Record the PoC 1 verdict** (small; edits `packages/plgg-poc-portal/src/pocs.ts` poc1 entry → `status: "proven"` + verdict, must keep `pocConsistent` green). Agreed verdict text: **"Proven — indexed full-text search. BM25 quality is comparable to vector RAG on the real guide corpus at ~1/5 the payload (fts.json 252 KB vs embeddings.json 1.4 MB) and none of the model tax; the vector arm's from-scratch cost is dominated by the un-scratchable embedding model (~25 MB CDN runtime + WASM init on every cold visit), which fails the plggpress vision's affordability bar. Re-evaluate only if PoC 2's agent grounding shows a concrete quality gap. Known cost on the FTS path: the from-scratch tokenizer is English-only (`[a-z0-9]+` runs) — CJK corpora need n-gram/segmenter tokenization (Ticket B)."**

2. **Ticket B — PoC 1 CJK tokenizer, measured** (developer chose a SEPARATE ticket, not folded into the verdict). Extend PoC 1 with a hybrid tokenizer (latin words + `Intl.Segmenter`/bigram for CJK runs) measured on a real Japanese corpus sample; show the index-size growth and a quality spot-check on the PoC 1 page. Upgrades the verdict's "CJK is a known cost" caveat into measured numbers. **Developer also asked for a Japanese-language explanation of whether the current full-text index works for Japanese — deliver that alongside this ticket.** (Short answer to prepare: the current tokenizer's `[a-z0-9]+` regex drops all Japanese text entirely — zero CJK tokens indexed — so it does NOT work for Japanese as-is; hence Ticket B.)

3. **Ticket C — PoC 2, reader-side embedded browser agent** (developer chose: build PoC 2 next, after the verdict). Decisions locked:
   - **Grounding proof = citations + canned set** (like PoC 1): every answer must cite its retrieved chunks (heading-path links into the site); a ~10-question canned set renders answers side-by-side with their retrieved evidence; developer judges grounding quality live.
   - **LLM access = dev-server session seam**: a tiny server endpoint in the PoC workload mints a short-lived session / proxies chat with `OPENAI_API_KEY` from the host env — mirrors the surviving `agentWeb.ts` `/api/agent/session` pattern; no key ever reaches the browser or the repo. **This means PoC 2 is NOT a static-only bundle** (unlike PoC 1) — it needs the server seam (allocate `plgg-poc2.qmu.dev` → :5185, already reserved in the portal map). Sovereignty note: reader queries inherently leave the device for the provider — state it either way.
   - Grounding tool = reuse PoC 1's `fts.ts` (proven BM25 arm); answer via `plgg-kit` `generateObject`; TEA reducer templated on `voiceAgent.ts`; citation formatting is greenfield.

## Considerations

- Working tree is **clean**; branch `work-20260711-125441` has no commits yet. Nothing half-applied.
- The two PoC containers (portal :5183, poc1 :5184) and the guide preview (:5181) are running; the cloudflared ingress for `plgg-poc.qmu.dev`/`plgg-poc1.qmu.dev` was applied this session (config backup at `~/.cloudflared/config.yml.bak-20260711`) and both are live behind Cloudflare Access.
- This resumption ticket covers ONLY the CI fix as driveable steps. Tickets A/B/C above are to be **filed via `/ticket`** (each needs its own quality-gate interrogation) after the CI fix — they are characterization, not steps here. Suggested order once CI is green: A (verdict) → B (CJK) → C (PoC 2), or A then C if PoC 2 is the priority and B is deferred.
- When filing/driving A/B/C and any future PoC package: add each new package to `scripts/npm-install.sh` at creation (the lesson this ticket encodes), plus `README.md` index, `check-all.sh`, and a `test-*.sh`.
