---
type: Mission
title: plggpress technical-confidence PoC portal
slug: plggpress-technical-confidence-poc-portal
status: active
created_at: 2026-07-11T03:31:36+09:00
author: a@qmu.jp
tickets: []
stories: []
concerns: []
---

# plggpress technical-confidence PoC portal

## Goal

plggpress is heading toward **Static Site Generator + Browser RAG, for both Writer and Reader** — out of the box, no mandatory central configuration, loading markdown when it generates/runs. Two users define the product:

- **Reader** (Static Mode, production-ready): `npx plggpress` generates a static site **with an embedded browser agent** and indexed document data, plus sitemap and code highlighting. The reader reads with browser AI support.
- **Writer** (Dynamic Mode, dev/edit only): `npx plggpress dev` is a hot-reloading server that, given `OPENAI_API_KEY`, shows an **interactive voice assistant** on the site (OpenAI Realtime API until a GPT Live API exists). The writer discusses the document with the AI — literally "on the same page" — and the browser agent's tool calls reach the dev server to **update local files**, with the edited page hot-reloading while the realtime websocket stays alive.

Around that core sit three more open challenges: **central configuration generation** (the writer asks the agent to classify by front-matter tags with display name/color/emoji/description, exclude paths, and switch layout/sizing/theme — minimal visual identity, ~5–10 prefixed sizing themes), **non-tree file classification** (the filesystem is a tree; group by tag and link in front matter, needing several prototypes for multi-dimensional search UX and browser-agent manipulatability), and the **Browser RAG decision itself** (browser-side vector DB only if its full-scratch cost is affordable, otherwise indexed full-text search in the browser).

Each of these is a real technical risk. This mission **collects confidence through a fleet of small PoCs before committing the production plggpress architecture**: every PoC is a separately runnable app on its own port, exposed via its own `*.qmu.dev` cloudflared hostname, and a **PoC portal** page links them all so the fleet is reviewable in one place. When a PoC proves its approach, its artifact is integrated into production plggpress; the portal is the durable map from open question → running proof → production integration.

## Scope

**Definition of done:**

- A PoC plan exists naming each PoC, the technical question it answers, and its confidence signal (what observation counts as "proven").
- A **PoC portal** app links every PoC page; portal and each PoC run on distinct local ports mapped to distinct `*.qmu.dev` hostnames in the cloudflared config (`tunnel qmu-dev`, `~/.cloudflared/config.yml`).
- The PoC fleet covers, at minimum: (1) browser-side search core — indexed FTS vs vector-DB RAG cost/quality on a real corpus; (2) reader-side embedded browser agent on a generated static site; (3) writer-side voice assistant over the Realtime API; (4) browser-agent tool-calling that edits local files through the dev server with hot reload keeping the websocket session; (5) central-configuration generation by the agent (tags, exclusions, layout/sizing themes); (6) non-tree classification — tag/link multi-dimensional search UX and its agent manipulatability.
- Each PoC records a verdict (proven / disproven / needs another round) on the portal.
- Proven PoC artifacts are integrated into the production plggpress/plgg-cms packages after the PoC phase.

**Out of scope:**

- Rewriting production plggpress before the PoCs deliver verdicts — integration comes after, not alongside.
- Production-grade auth/ops for PoC apps (dev-only surfaces behind qmu.dev).
- The plggmatic/Pragmatic DSL work — tracked by `plggmatic-ai-native-ui-toward-a-dsl`.

## Acceptance

<!-- Ticket filenames are attached as (#<ticket>.md) markers when each ticket is filed via /ticket. -->

- [x] PoC plan recorded: each PoC named with its technical question and confidence signal (#20260711035317-plggpress-poc-portal-and-plan.md)
- [x] PoC portal serves an index page linking every PoC, each PoC on its own port + `*.qmu.dev` hostname via cloudflared (#20260711035317-plggpress-poc-portal-and-plan.md)
- [x] PoC: browser search core — indexed full-text search vs browser vector-DB RAG measured on a real corpus (index size, build time, query latency, answer quality); verdict recorded (#20260711035318-poc1-browser-search-core.md)
- [x] PoC: reader-side embedded browser agent answering questions grounded in the indexed document data of a generated static site (#20260711201840-poc2-reader-side-browser-agent.md)
- [x] PoC: writer-side interactive voice assistant over the OpenAI Realtime API, "on the same page" with the open document (#20260712030000-poc3-writer-voice-assistant.md)
- [ ] PoC: browser-agent tool-calling edits local files via the dev server; edited page hot-reloads while the realtime websocket stays connected
- [ ] PoC: central configuration generation — agent classifies by front-matter tags (name/color/emoji/description), excludes paths, switches layout and sizing themes
- [ ] PoC: non-tree classification — tag/link-grouped multi-dimensional search UX prototypes, manipulable by the browser agent
- [ ] Post-PoC integration: proven artifacts integrated into production plggpress, portal verdicts closed out

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->
- 2026-07-11 — ticket archived — 20260711035317-plggpress-poc-portal-and-plan.md
- 2026-07-11 — ticket archived — 20260711035318-poc1-browser-search-core.md
- 2026-07-11 — story reported — work-20260711-035119.md
- 2026-07-11 — concern deferred (stuck) — 62-97-standing-deferred-concerns-carried-prs.md
- 2026-07-11 — concern deferred (stuck) — 62-rag-arm-s-in-browser-model.md
- 2026-07-11 — concern deferred (stuck) — 62-cloudflared-ingress-for-the-poc-hostnames.md
- 2026-07-11 — concern deferred (stuck) — 62-cdn-model-load-is-an-external.md
- 2026-07-11 — concern deferred (stuck) — 62-embeddings-json-is-5-7x-the.md
- 2026-07-11 — concern deferred (stuck) — 62-portal-s-verdict-data-is-hand.md
- 2026-07-11 — ticket archived — 20260711131543-resume-poc-fleet-ci-fix-and-next-tickets.md
- 2026-07-11 — ticket archived — 20260711162512-record-poc1-verdict.md
- 2026-07-11 — ticket archived — 20260711170040-poc1-cjk-tokenizer-measured.md
- 2026-07-11 — concern resolved (unstuck) — 62-embeddings-json-is-5-7x-the.md
- 2026-07-11 — story reported — work-20260711-125441.md
- 2026-07-12 — concern deferred (stuck) — 63-carried-from-prs-31-62-102.md
- 2026-07-12 — concern deferred (stuck) — 63-corpus-bytes-metric-uses-character-count.md
- 2026-07-12 — concern deferred (stuck) — 63-pre-existing-poc-source-not-fully.md
- 2026-07-12 — concern deferred (stuck) — 63-dsl-division-of-labor-between-plgg.md
- 2026-07-12 — concern deferred (stuck) — 63-cross-repo-acceptance-check-off-has.md
- 2026-07-12 — ticket archived — 20260711201840-poc2-reader-side-browser-agent.md
- 2026-07-12 — ticket archived — 20260712014500-poc2-japanese-grounding.md
- 2026-07-12 — ticket archived — 20260712023000-poc2-full-ja-article-corpus.md
- 2026-07-12 — ticket archived — 20260712024500-record-poc2-verdict.md
- 2026-07-12 — ticket archived — 20260712030000-poc3-writer-voice-assistant.md
- 2026-07-12 — story reported — work-20260712-003840.md
- 2026-07-12 — ticket archived — 20260712113318-resume-poc3-verdict-and-ship.md
- 2026-07-12 — concern deferred (stuck) — 64-107-standing-deferred-concerns-from-prior.md
- 2026-07-12 — concern deferred (stuck) — 64-full-corpus-build-depends-on-the.md
- 2026-07-12 — concern deferred (stuck) — 64-portal-verdict-data-remains-hand-edited.md
- 2026-07-12 — PR #64 merged (a9ff447f) and GitHub Release 2026.07.week2.release5 published; PoC 3 judged proven live and recorded on the portal; nothing to npm-publish — work-20260712-003840.md
- 2026-07-13 — ticket archived — 20260713115737-resume-poc4-plggpress-mission.md
- 2026-07-13 — ticket archived — 20260712152250-poc4-agent-file-edits-hot-reload.md
- 2026-07-13 — ticket archived — 20260713144522-root-env-file-for-credentials.md
- 2026-07-13 — ticket archived — 20260713150647-poc4-speak-document-language.md
- 2026-07-13 — ticket archived — 20260713151530-poc4-pin-gpt-realtime-2-1.md
