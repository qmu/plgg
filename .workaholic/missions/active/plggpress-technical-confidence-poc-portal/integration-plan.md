# Post-PoC integration — gap analysis

Mission: `plggpress-technical-confidence-poc-portal`, final acceptance item —
"Post-PoC integration: proven artifacts integrated into production
plggpress/plgg-cms, portal verdicts closed out."

## Already-in-production (overlaps found)

**plggpress (static generator) — the Reader vision is almost entirely absent.**
The SSG pipeline is `discover → link-check → render → assets → 404`
(`plggpress/src/build.ts` → `framework/Build`). It emits pure static HTML.
Confirmed by grep: no sitemap, no shipped browser-side search index, no client
JS bundle, no embedded browser agent. Code highlighting IS present (build-time,
via `plgg-highlight` through the theme). Of the Reader deliverables — embedded
browser agent + indexed data + sitemap + highlighting — only highlighting
exists today.

**plgg-cms has FTS, RAG, voice-agent, and editing — but all SERVER-side, the
opposite topology of the mission's Reader.**

- `plgg-cms/src/content/Query/usecase/searchIndex.ts` — SQLite FTS5
  (`fts5Match`, `bm25Rank` from plgg-sql). Server-side BM25 over the always-on
  index. PoC 1 proved a *from-scratch, zero-dep, browser-side* BM25
  (`plgg-poc1-search/src/search/fts.ts`) — different runtime, not reusable
  as-is.
- `plgg-cms/src/content/Rag/*` — embeddings, `semanticSearch`, `similarity`,
  `ragSearch`, `embedderConfig` (OpenAI-shaped network embedder). This is the
  vector arm PoC 1 measured and *rejected* for the browser (~25 MB model tax);
  PoC 1 vendored `similarity.ts` verbatim to benchmark it. Fine server-side;
  not the reader path.
- `plgg-cms/src/agent/*` — `agentWeb` (ephemeral-key mint seam via plgg-kit
  `KeyMinter`), `voiceAgent` (TEA `VoiceState` reducer), `realtimeBackend`
  (WebRTC/mic browser seam), `voiceIo` (a `/search` RAG tool effect),
  `voiceView` (client render). A real server-mediated Realtime voice agent with
  one RAG tool — substantially overlaps PoC 3's voice loop, but wired to the
  admin/auth surface and a single server RAG call, NOT the writer's "on the
  same page with the open document + agent-driven repeated keyword search +
  file edits" loop.
- `plgg-cms/src/editing/*` — `editorWeb` (human draft editor, CSRF) +
  `exportFs` (atomic temp+rename writes with path-safety + optimistic hash
  `publishDraft`). A *human draft/publish* workflow, NOT an agent-tool-call
  edit-with-hot-reload seam. PoC 4/4b's `resolveEditPath` guard + `applyEdits`
  granular ops are new; but `exportFs`'s atomic-write pattern is exactly what
  PoC 4 says it mirrored — reuse it, don't re-port.
- **Ephemeral-key mint seam already exists** in production (plgg-kit +
  `agentWeb`), so PoC 3/4/4b's `/api/session` does not need re-porting — point
  the integrated writer loop at it.
- plggpress Config: `plggpress/src/Config`, `SiteConfig`, `defineSite` — a
  typed site-config contract exists. PoC 5's contribution is making it
  *agent-maintainable* (ConfigOp/applyOp + closed-union sizing/layout dials),
  not the config concept.
- plggpress navigation: `theme/sidebarTree.ts` is the tree sidebar. PoC 6's
  tag-facet / link-graph / multi-filter navigation is entirely new.

## Proposed integration tickets (dependency order)

**1. Port the browser-side FTS search core into production (foundation).**
- Target: `plggpress` (new internal module, e.g. `plggpress/src/Search/`) or a
  small shared `plgg-search` package if plgg-cms is to share it.
- Integrate (PORT, pure code): `plgg-poc1-search/src/search/tokenize.ts` (CJK
  tokenizer — latin `[a-z0-9]+` **plus** `Intl.Segmenter("ja")` word mode, with
  the bigram fallback embedded in `FtsIndex.cjk` so index/query strategy can't
  mismatch), `src/search/fts.ts` (from-scratch BM25 + inverted index), the
  heading-path chunker from `src/indexer/`. Zero-dep pure functions, already
  spec-covered.
- Do NOT port: the vector arm (`rag.ts`, `vendors/`,
  `@huggingface/transformers`) — PoC 1's verdict rejected it for the browser.
- Size: **M**.
- Blockers/decisions: where the shared FTS core lives — new `plgg-search`
  package (cleanest) vs. internal to plggpress with plgg-cms importing across.
  Recommend a small package.

**2. Static build emits the browser FTS index + sitemap.**
- Target: `plggpress` build pipeline (`plggpress/src/build.ts` /
  `framework/Build`, a post-render asset step).
- Integrate: PoC 1/2's build-time index emitter (chunk corpus by heading path →
  `fts.json`, script-routed EN + JA indexes as in
  `plgg-poc2-agent/src/entrypoints/`), written into `outDir` as a shipped
  asset. Add a **sitemap.xml** generator over the discovered route set (no PoC —
  straightforward new build step; mission Reader names it explicitly).
- Size: **M**.
- Blockers/decisions: index size budget for large corpora (PoC 2 measured
  ja-fts.json ≈ 2.3 MB shipping the corpus whole — acceptable? paginate/
  lazy-load?). Depends on **#1**.

**3. Reader-side embedded browser agent on the generated site.**
- Target: `plggpress` (client bundle the SSG injects into every page + one thin
  answer seam). Model seam may live in `plgg-cms` or a minimal function.
- Integrate: `plgg-poc2-agent/src/app.ts` + `view.ts` (agent UI +
  citations-next-to-evidence render), `answer.ts`/`protocol.ts` (`POST
  /api/answer` calling plgg-kit `generateObject`, key server-side, honest-404
  contract mirroring `agentWeb`), `poc1.ts` reuse seam onto the #1 FTS core.
  Citations link into live pages.
- Size: **L**.
- Blockers/decisions: plggpress currently ships NO client JS — this introduces a
  client-bundle build step into the SSG (architectural). Where the answer seam
  is hosted for a *static* site ("no server round-trip beyond the model call") —
  tiny function vs. reuse plgg-cms. Depends on **#1, #2**.

**4. Writer dev-mode voice assistant "on the same page".**
- Target: `plggpress dev` (`plggpress/src/framework/Dev` + `devServerEntry.ts`)
  as the command owner; reuse `plgg-cms/src/agent` machinery where possible.
- Integrate: `plgg-poc3-voice/src/agent.ts` (event decoder, tool executor,
  instruction assembly carrying the open document), `vendors/realtime.ts`
  (WebRTC seam — compare against `plgg-cms/agent/realtimeBackend.ts`, likely
  consolidate), the agent-DRIVEN `search_docs` loop over the #1 FTS core
  (repeated model-generated keyword variations + on-page tool-call trail). Mint
  via the existing production `agentWeb` seam.
- Size: **L**.
- Blockers/decisions: reconcile with the existing `plgg-cms/agent` voice agent
  (single server RAG tool + admin/auth wiring) — extend vs. bring in the PoC's
  browser-driven-search shape. Decide whether writer-mode agent code lives in
  plggpress (owns `dev`) or stays in plgg-cms and plggpress consumes it. Depends
  on **#1**.

**5. Writer agent file edits with live co-editing preview (the winning
artifact).**
- Target: `plggpress dev` write seam; reuse `plgg-cms/src/editing/exportFs.ts`
  atomic write.
- Integrate: the **PoC 4b** granular path (it superseded PoC 4) —
  `plgg-poc4b-coedit/src/edit.ts` (`applyEdits` + span locator + diff builder,
  pure, 100% covered), `editPath.ts` (`resolveEditPath` guard — relative/
  no-traversal/.md-only), `effects.ts`/`view.ts` (the **micro-animation**
  live-preview on plgg-view's WAAPI + keyed reconciliation — the mode the
  developer chose over before/after diff), `edit_doc {find,replace}` tool over
  the surviving Realtime session. Rebuild-index-after-edit so the next
  `search_docs` sees new text.
- Size: **L**.
- Blockers/decisions: PoC 4b deliberately **dropped plggpress theming** in its
  live preview (accepted PoC trade). Production must re-marry the in-place patch
  animation with real plggpress-rendered chrome — the open "PoC 4 × 4b
  synthesis" the PoC 4 verdict flagged (the orphaned `plgg-poc4c-livesite` was
  the abandoned attempt; see deferred concern
  `plgg-poc4c-livesite-is-orphaned`). Real design work, not mechanical. Depends
  on **#4**.

**6. Agent-maintained central configuration generation.**
- Target: `plggpress` Config (`plggpress/src/Config` / `SiteConfig`).
- Integrate: `plgg-poc5-config/src/config.ts` (closed-union color/sizing/layout
  dials, exhaustive switch), `apply.ts` (`ConfigOp` + total `applyOp`),
  `command.ts` (deterministic parser), `agent.ts` (five tools `set_tag`/
  `exclude_path`/`include_path`/`set_sizing_theme`/`set_layout`). Map onto real
  `SiteConfig` fields.
- Size: **M**.
- Blockers/decisions (explicit): PoC 5's config was **client-state only, no
  disk-persistence seam** — its verdict says "production plggpress owns where
  generated config durably lives." Decide the persistence target (write back to
  `site.config.ts`? a generated sidecar? through `exportFs`?). Depends loosely
  on **#5** (shares the write-seam decision).

**7. Non-tree classification navigation.**
- Target: `plggpress` theme/navigation (alongside `theme/sidebarTree.ts`).
- Integrate: `plgg-poc6-classify/src/classify.ts` (tags from path segments +
  front-matter, links + inverse-adjacency backlinks — pure offline),
  `variants.ts` (three variant queries + total `runQuery`), `command.ts`,
  `agent.ts` (three tools). Build classification into the SSG's data model.
- Size: **M–L**.
- Blockers/decisions (explicit): PoC 6 **deliberately chose no winning variant**
  — "the proven artifact is the comparison itself." Production must pick which
  of tag-facets / link-graph / multi-filter to ship (or ship several). Real
  product decision, not mechanical. Depends on **#1** (shares corpus-index
  model).

**8. Close out portal verdicts + mission acceptance.**
- Target: `plgg-poc-portal/src/pocs.ts` (mark integrated), `mission.md`
  acceptance item + the PoC-4b unlisted-acceptance-line question the mission
  comment raises, and the standing deferred concerns
  (`portal-s-static-page-is-not`, `plgg-poc4c-livesite-is-orphaned`,
  `ticket-diagnostics-measurements-held-conclusions-did`).
- Size: **S**. Depends on **#1–#7** (or a decision to close out incrementally).

## Recommended first ticket (drivable autonomously tonight)

**Ticket #1 (browser-side FTS search core).** Dependency root of the entire
Reader path (#2, #3) and the writer search tool (#4), and the most mechanical of
the set: the artifacts are **pure, zero-dependency, already-spec-covered
functions** (`tokenize.ts` with the `Intl.Segmenter` CJK measurement, `fts.ts`
BM25, the heading-path chunker) that port without any live browser judging, no
`OPENAI_API_KEY`, no Realtime/WebRTC surface. The one decision it forces — new
`plgg-search` package vs. internal-to-plggpress — is small and follows the
existing new-package scaffold conventions. Everything else needs a live-judgment
loop (#3/#4/#5), a deliberate product choice the developer withheld (#6 variant,
#7 winner), or a persistence-architecture decision (#5/#6) — poor
autonomous-overnight candidates.

## Key source paths (absolute)

- `/home/ec2-user/projects/plgg/packages/plgg-poc1-search/src/search/`
- `/home/ec2-user/projects/plgg/packages/plgg-poc2-agent/src/`
- `/home/ec2-user/projects/plgg/packages/plgg-poc4b-coedit/src/`
- `/home/ec2-user/projects/plgg/packages/plgg-poc5-config/src/`
- `/home/ec2-user/projects/plgg/packages/plgg-poc6-classify/src/`
- Production seams to reuse:
  `/home/ec2-user/projects/plgg/packages/plgg-cms/src/editing/exportFs.ts`,
  `/home/ec2-user/projects/plgg/packages/plgg-cms/src/agent/agentWeb.ts`,
  `/home/ec2-user/projects/plgg/packages/plggpress/src/build.ts`
