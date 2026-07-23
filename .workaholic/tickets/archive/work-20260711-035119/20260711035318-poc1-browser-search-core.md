---
created_at: 2026-07-11T03:53:17+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain, Infrastructure]
effort: 4h
commit_hash: d939f300
category: Added
depends_on: [20260711035317-plggpress-poc-portal-and-plan.md]
mission: plggpress-technical-confidence-poc-portal
---

# PoC 1 — browser search core: indexed full-text search vs browser vector-DB RAG, measured on the plgg guide corpus

## Overview

The first technical PoC of mission `plggpress-technical-confidence-poc-portal`, answering the plggpress vision's open decision: *"Browser side vector DB RAG only when its full scratch cost is affordable — or indexed Full Text Search on browser side."* Everything plggpress has today is **server-side** (plgg-cms: SQLite FTS5/BM25 + network-embedder RAG with pure-JS cosine top-k). This PoC moves both arms **into the browser** and measures them against each other on the real corpus — the plgg guide (`packages/guide`: 38 markdown files, ~3,574 lines, ~121 KB), small enough that shipping a whole precomputed index to the client is plausibly fine, which is exactly the feasibility question.

Two arms, one app (`plgg-poc1.qmu.dev` → :5184, allocated by the portal ticket):

- **FTS arm (from-scratch, always-on):** a build-time step chunks the guide corpus and emits a JSON inverted index; the browser runs a from-scratch JS tokenizer + ranked lookup (BM25-like), no dependencies. Server-side FTS5/BM25 is the quality baseline it is compared against.
- **Vector-RAG arm (PoC-only deps allowed):** build-time chunk embeddings emitted as JSON (plgg-cms `Embedding` wire format, reusing `serializeEmbedding`); browser ranking reuses `cosineSimilarity`/`topK` from `plgg-cms/src/content/Rag/usecase/similarity.ts` verbatim (pure, dependency-free). Live query embedding is the crux: evaluate an in-browser embedding model (off-the-shelf WASM/JS lib — permitted for the PoC with a dependency decision log) and/or a query-time network embedding call, measuring what each costs.

The app is a plgg-view program: a URL-held search box, side-by-side result panes (FTS | RAG), and a **metrics table** — index payload size (bytes), index build time, query latency p50/p95 over a canned query set, per-arm. ~10 canned guide questions render side-by-side for answer-quality judgment. The developer records the verdict (which arm, and the vector arm's from-scratch cost estimate) on the portal's PoC record — mission acceptance item 3.

## Policies

The implementing session MUST read each linked policy hard copy before writing code and keep every change defensible against its Goal (目標), Responsibility (責務), and Practices (実践).

- `workaholic:implementation` / `policies/directory-structure.md` — new one-directory package `packages/plgg-poc1-search`; build-time indexer and browser app in one package, roles separated inside `src/`
- `workaholic:implementation` / `policies/coding-standards.md` — house style applies; the pure cores (tokenizer, inverted index, ranking) are exactly the code that must be total and escape-hatch-free
- `workaholic:design` / `policies/vendor-neutrality.md` — the vector arm's off-the-shelf lib is a NEW third-party dep in a zero-runtime-deps repo: requires a dependency decision log (reason, assessment, monitoring, exit strategy) and confinement behind the vendor boundary; the PoC's measurements ARE the assessment/exit-strategy evidence
- `workaholic:implementation` / `policies/anti-corruption-structure.md` — third-party imports live only under `src/vendors/` (machine-enforced by `gate-vendor-boundary.sh`); the domain sees an `Embedder`-shaped abstraction, mirroring plgg-cms's injected `SearchDeps`
- `workaholic:design` / `policies/data-sovereignty.md` — browser-side indexing keeps the corpus client-side (the sovereignty-aligned default); a query-time network embedding call moves query text off-device — flag it explicitly in the findings
- `workaholic:design` / `policies/modeless-design.md` — the query and any result selection live in the URL (deep-linkable searches)
- `workaholic:design` / `policies/self-explanatory-ui.md` — design all four states: indexing/loading, empty query, no results, error (embedder unavailable → RAG arm degrades, FTS stays on)
- `workaholic:planning` / `policies/proactive-poc.md` — minimum build to answer the verification question; built to discard, verdict is the deliverable

## Key Files

- `packages/plgg-cms/src/content/Rag/usecase/similarity.ts` - `cosineSimilarity`/`topK`: pure, dependency-free; reuse verbatim in the browser
- `packages/plgg-cms/src/content/Rag/model/Embedding.ts` - `Embedding` + JSON (de)serialization; the wire format for the precomputed index asset
- `packages/plgg-cms/src/content/Rag/usecase/semanticSearch.ts` - the injected-deps orchestration shape (Option<Embedder>, graceful FTS fallback) the browser version mirrors
- `packages/plgg-cms/src/content/Rag/usecase/chunkEmbeddings.ts` - how chunks become ranking candidates today (SQLite column → replace with a static JSON asset emitted at build time)
- `packages/plgg-cms/src/content/Rag/usecase/embedderConfig.ts` - the OpenAI-shaped network embedder; the query-time-embedding option and the build-time embedding source
- `packages/plgg-cms/src/content/Query/usecase/searchIndex.ts` - FTS5/BM25 server baseline the from-scratch browser FTS is judged against
- `packages/guide/` - the measured corpus (38 files, ~121 KB)
- `packages/plgg-md/`, `packages/plgg-parser/` - in-house markdown/tokenization to chunk the corpus at build time (implement-by-default: no external tokenizer)
- `packages/example/bundle.config.ts` - `target:"app"` browser bundle scaffold
- `scripts/gate-vendor-boundary.sh`, `scripts/vendor-boundary-exemptions.txt` - the machine-checked vendor boundary the PoC-only dep must satisfy

## Related History

Prior work built the server-side ancestors of both arms; this PoC is their browser-side benchmark, not a re-derivation.

- [20260704143024-rag-embeddings-and-search.md](.workaholic/tickets/archive/work-20260704-130317/20260704143024-rag-embeddings-and-search.md) - the design ancestor: zero-dep embeddings tier, in-JS cosine top-k, hybrid degrade-to-BM25 (server-side)
- [20260704143015-plgg-sql-fts5-support.md](.workaholic/tickets/archive/work-20260704-130317/20260704143015-plgg-sql-fts5-support.md) - the FTS5/BM25 baseline implementation and its query-sanitizer lessons
- [20260704143016-plggpress-content-index-and-delivery-api.md](.workaholic/tickets/archive/work-20260704-130317/20260704143016-plggpress-content-index-and-delivery-api.md) - the guide-corpus chunking model (chunks/heading paths) to mirror at build time

## Implementation Steps

1. Scaffold `packages/plgg-poc1-search` (private) from `packages/example` (same package.json/bundle.config/tsconfig shape as the portal ticket).
2. Build-time indexer (`src/indexer/`, run by a package script): read `packages/guide` markdown, chunk by heading path (mirroring plgg-cms's chunk model, tokenizing via plgg-md/plgg-parser), emit `dist/index/fts.json` (inverted index: term → postings with positions/frequencies) and `dist/index/embeddings.json` (chunk id → Embedding, `serializeEmbedding` format). Record build time and emitted byte sizes into `dist/index/metrics.json`.
3. Build-time embeddings source: reuse the plgg-cms embedder pattern (OpenAI-shaped endpoint, `OPENAI_API_KEY` from env, dev-time only). Absent key → embeddings asset omitted → RAG arm shows its degraded state (FTS always works).
4. Browser FTS arm (`src/search/fts.ts`, pure): from-scratch tokenizer + BM25-like ranking over the fetched inverted index; total functions, exhaustively tested.
5. Browser RAG arm (`src/search/rag.ts`): fetch embeddings asset; rank with `cosineSimilarity`/`topK` (reused). Query embedding behind an `Embedder` abstraction with two impls under `src/vendors/`: (a) in-browser model via the chosen off-the-shelf WASM/JS lib, (b) query-time network call. Write the dependency decision log for (a) and add the vendor-boundary exemption.
6. UI (`src/main.ts` + views): URL-held query box; side-by-side FTS | RAG result panes with heading-path + snippet; metrics table (index bytes, build time, per-arm query latency p50/p95 measured over the canned set in-browser); a canned-queries view rendering ~10 representative guide questions side-by-side. Four states designed per arm.
7. Serve: `workloads/poc1-search/compose.yaml` on host **5184**; `scripts/serve-poc.sh poc1-search`; developer applies the `plgg-poc1.qmu.dev` → :5184 tunnel ingress.
8. Measure on the full corpus, then update the portal's PoC record (`packages/plgg-poc-portal/src/pocs.ts`): status → measured outcome, verdict text including the vector arm's from-scratch cost estimate (what implementing the embedding path with zero deps would take, per the vision's "only when its full scratch cost is affordable").
9. Wire into README index + build order + test entry (same gate wiring as the portal ticket established for PoC packages).

## Quality Gate

Captured from the developer at ticket time (2026-07-11): **typecheck + smoke** bar for PoC code; verdict = **metrics + judgment**; **PoC-only deps OK** for the vector arm with a from-scratch cost estimate in the verdict; approval **via the qmu.dev URL**.

**Acceptance criteria** — the checkable conditions that must hold:

- Strict typecheck green; zero `as`/`any`/`ts-ignore`; third-party imports confined to `src/vendors/` with a vendor-boundary exemption entry and a dependency decision log in the package README.
- Smoke specs (plgg-test) cover the pure cores: tokenizer, inverted-index build + lookup, BM25-like ranking, and the reused cosine/topK wiring; the degraded path (no embeddings asset / no embedder) is asserted.
- The indexer runs over the full guide corpus (all 38 files) and emits fts.json + embeddings.json + metrics.json; nothing is sampled silently.
- The app shows a metrics table with real measured values per arm (index bytes, build time, query latency p50/p95 over the canned set) and ~10 canned queries side-by-side.
- FTS arm works with zero third-party deps and stays functional when the RAG arm is unavailable (graceful degradation).
- The portal's PoC 1 record carries the recorded verdict including the vector arm's from-scratch cost estimate.

**Verification method** — the commands/tests/probes that prove them:

- Package `tsc --noEmit` + `plgg-test src` green; `scripts/gate-vendor-boundary.sh` green with the exemption in place.
- Indexer script run prints/persists metrics.json; spot-check a known guide term (e.g. "proc") and a known semantic query return the expected pages in each arm.
- `curl -s http://localhost:5184/` serves the app after `serve-poc.sh poc1-search`.

**Gate** — what must pass before approval:

- All of the above green, plus the developer opens `https://plgg-poc1.qmu.dev`, runs live queries against both arms, reads the metrics table, judges the ~10 canned side-by-side results, and records the verdict on the portal. A confirmation that the sovereignty trade-off of the network-embedding option is stated in the findings is part of the review.

## Considerations

- Query embedding is the real cost decision: precomputing query vectors is impossible, so the vector arm either ships an in-browser model (payload + init time — measure them) or calls a network embedder per query (latency + query text leaves the device — sovereignty flag). Both measurements belong in the metrics table (`packages/plgg-poc1-search/src/vendors/`).
- The corpus is ~121 KB, so a full-JSON index is plausible — but the embeddings asset scales with chunk count × dimensions; record the asset size prominently since the vision's affordability question is precisely this (`dist/index/embeddings.json`).
- Reuse `similarity.ts` by import if plgg-cms's export surface allows it cleanly; otherwise copy the two pure functions with a provenance comment — do not add a plgg-cms runtime dependency to a sacrificial PoC package just for 30 pure lines (`packages/plgg-cms/src/content/Rag/usecase/similarity.ts`).
- FTS5 query-sanitizer lessons from the server work apply to the from-scratch browser tokenizer: define the accepted query grammar totally rather than passing raw strings into ranking (`packages/plgg-sql`, prior ticket 20260704143015).
- The verdict feeds production integration later (mission acceptance item 9): keep the findings written as data/prose the portal renders, not only as in-app UI state (`packages/plgg-poc-portal/src/pocs.ts`).

## Final Report

Development completed as planned. Both arms are implemented and measured on the full corpus (38 files → 178 heading-path chunks, ~118 KB): the from-scratch FTS arm (shared tokenizer, JSON inverted index, BM25) ships as `fts.json` at ~252 KB built in ~19 ms; the vector arm ships MiniLM (`Xenova/all-MiniLM-L6-v2`, 384d) chunk vectors as `embeddings.json` at ~1.4 MB built in ~11 s on this host's CPU — build-time embedding runs fully locally through the same `@huggingface/transformers` package the browser loads from the CDN, so both sides share one embedding space and no API key or corpus upload is involved (`OPENAI_API_KEY` was absent; the OpenAI-shaped network embedder ships as the documented key-gated alternative and renders as the arm's honest "unavailable" state). The dependency decision log lives in the package README; the third-party imports are confined to `src/vendors/` and `gate-vendor-boundary` stays green without exemptions.

Verification run against the Quality Gate: strict `tsc --noEmit` exit 0, zero escape hatches; 12 plgg-test specs green covering the pure cores (chunker incl. code-fence handling, tokenizer, BM25 ranking incl. idf ordering and noise-query emptiness, cosine/topK totality on malformed input) with 100% statement coverage on those modules; the full-corpus indexer emits fts.json + embeddings.json + metrics.json with nothing sampled; `scripts/check-all.sh` fully green (fresh rebuild, all 23 scripts) with the package wired into README/build/test gates; the containerized workload serves 200 on localhost:5184 next to the portal on 5183. Real-browser (headless chromium) verification: the app boots, loads all three assets, and the FTS arm ranks the URL-held query with plausible scores end-to-end; the CDN dynamic import of transformers.js resolves in-browser. The RAG arm's in-browser model init could NOT be observed to completion headlessly — ONNX/WASM init does not conclude under chromium's --dump-dom/--virtual-time-budget harness (probes isolated this to pipeline() init, not to this app's code; the same call completes in node). The app shows its designed loading/failed states meanwhile and FTS stays fully functional (graceful degradation). Confirming the RAG arm live and recording the verdict on the portal (with the vector arm's from-scratch cost estimate) is the developer's morning gate at https://plgg-poc1.qmu.dev/ — per the ticket's division of assurance.

### Discovered Insights

- **Insight**: plgg-bundle passes a dynamic `import(variable)` through to the native runtime untouched, which makes "load a heavy vendor from a CDN at runtime, keep it out of the bundle" a one-line pattern — and keeps TypeScript from attempting module resolution since the specifier is a variable.
  **Context**: the sanctioned way to keep measured-cost dependencies visible; also the reason the client bundle stays at 225 KB while the model is ~25 MB.
- **Insight**: chunk and query vectors must come from the same model, so the model id belongs in ONE shared constant stamped into the asset and asserted before ranking — the app refuses to cosine across mismatched spaces with an explained state.
  **Context**: any future plggpress RAG integration needs this same guard; silent cross-space cosine produces plausible-looking garbage.
- **Insight**: headless chromium's --virtual-time-budget harness cannot drive onnxruntime-web's WASM init to completion (workers + WASM compile don't advance under virtual time), while the identical transformers.js call completes in node.
  **Context**: browser-side model verification needs a real interactive browser (or a Playwright session), not dump-dom; budget for that in any PoC that loads models client-side.
- **Insight**: this host's `ls` is colorized even in scripts — command-substituting `ls` output into a variable embeds ANSI codes and yields exit-127 "not found" for a path that visibly exists; use plain literal paths or `command ls`.
  **Context**: cost one debugging round tonight; recorded for the next agent.
