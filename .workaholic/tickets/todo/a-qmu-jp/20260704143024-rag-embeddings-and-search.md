---
created_at: 2026-07-04T14:30:24+09:00
author: a@qmu.jp
type: enhancement
layer: [DB, Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260704143015-plgg-sql-fts5-support.md, 20260704143016-plggpress-content-index-and-delivery-api.md]
---

# RAG opt-in embeddings tier: a `plgg-kit` embeddings vendor seam, per-chunk `Float32` BLOB storage on `plgg-content`'s `chunks` index, in-JS cosine top-k, and a hybrid FTS5+vector search that **gracefully degrades to BM25 with no API key**

## Overview

Phase 8 (RAG), ticket **24** of the plggpress/plggmatic roadmap — the only
ticket in its phase. It layers the **opt-in embeddings tier** on top of the
always-on FTS5/BM25 baseline that ticket **16** (`plgg-content`) already ships,
turning "keyword search over the guide corpus" into retrieval-augmented search
whose results the voice agent (ticket **25**, Phase 9) and the MCP tools
(tickets 26/27) consume. Decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

Two governing decisions, transcribed here so an implementer need not open the
spec:

- **D11 — RAG substrate:** *"Zero-dependency purism: always-on baseline =
  SQLite FTS5 (BM25); opt-in embeddings = BLOB Float32 + JS cosine top-k.
  **No sqlite-vec/native extensions.** Graceful degradation without an API
  key."* This is the whole architecture of the ticket. There is **no vector
  extension**: an embedding is a `Float32Array` serialized to a SQLite `BLOB`
  column on the existing `chunks` table (ticket 16), and top-k similarity is a
  **plain JavaScript cosine** loop over the candidate chunks — not a native
  index, not `sqlite-vec`, not `vec0`, not an ANN library. This is the deliberate
  price of zero-dependency purism at the guide/qmu corpus scale (the in-house
  ANN index for large corpora is the D11 *revisit trigger*, explicitly deferred
  in the spec — see Considerations). **Graceful degradation** is a hard
  requirement, not a nicety: with **no** LLM API key configured, embeddings are
  never generated, the embedding column stays empty, and search **falls back to
  ticket 16's FTS5/BM25 path** returning sane results — the CMS's "minimal,
  zero-dependency identity" (spec Vision) must hold for an operator who never
  configures a key.

- **D12 — LLM seam & Realtime:** *"**plgg-kit is the single active vendor
  seam** (settles retired-vs-live ambiguity: it is LIVE). Add
  embeddings/streaming/ephemeral-key minting there … Vendor kept swappable
  behind the seam."* Every call that turns text into a vector goes through
  **one** function added to `plgg-kit`'s existing `LLMs` domain, patterned
  exactly on the live `generateObject`
  (`packages/plgg-kit/src/LLMs/usecase/generateObject.ts`): a
  `Provider`-parameterized entry that resolves the key from the provider's
  `Option<apiKey>` or the environment, dispatches with an exhaustive `match`
  over the `Provider` sum (`openAI$ | anthropic$ | google$`,
  `packages/plgg-kit/src/LLMs/model/Provider.ts`), and threads an injectable
  `post = postJson` network seam for offline specs. plgg-content and plggpress
  call **only** that seam — no vendor SDK, no `fetch` to an embeddings API
  anywhere else — so swapping OpenAI for another embeddings vendor is a one-file
  change behind the seam. (Realtime/ephemeral-key minting and the browser voice
  loop are **ticket 25's** half of D12; the RAG *tool-call endpoint* the agent
  queries is `plgg-content`'s `searchIndex`/`ragSearch` exposed over HTTP by
  plggpress — this ticket delivers that retrieval, ticket 25 wires the agent to
  it.)

Where each piece lands (three seams, three owners):

1. **`plgg-kit` (vendor seam, D12):** a new `generateEmbedding` usecase beside
   `generateObject`, with a per-vendor request builder beside
   `reqObjectGPT`/`reqObjectClaude`/`reqObjectGemini`
   (`packages/plgg-kit/src/LLMs/vendor/`). This is the swappable embeddings
   vendor boundary.
2. **`plgg-content` (storage + retrieval, D11):** an `embedding BLOB` column on
   the `chunks` table ticket 16 laid down (chunk granularity is the RAG seam ticket
   16 chose *"so ticket 24 can attach a `Float32` embedding BLOB per chunk …
   without re-chunking. Keep `chunks` stable"*), a `Float32Array`↔`BLOB` codec,
   an in-JS cosine top-k `vectorSearch`, and a `ragSearch` that fuses vector
   top-k with ticket 16's FTS5/`bm25Rank` and **degrades to FTS5 alone when the
   embedding column is empty** — all still HTTP-free (ticket 16's D17 rule: the
   query functions are callable in-process for the MCP/plugin path).
3. **plggpress (wiring):** generate-and-store embeddings during ingest **only
   when a key is configured** (reusing ticket 16's `ingestFromConfig`), and
   expose `ragSearch` at the `pressServeWeb` seam as the retrieval endpoint the
   agent/MCP call.

The **Phase 8 quality gate** the spec pins for this ticket (spec line 105):
*"explicit degraded behavior verified with NO API key configured → FTS5
fallback"* (the *agent UI hidden/disabled* half of that gate line belongs to
ticket 25). This ticket must **prove**, with a spec and a runnable demo, that
retrieval works and returns sane results with the key **unset**.

Scope guardrails (siblings own the rest): the FTS5 SQL vocabulary
(`createFts5Table`/`fts5Match`/`bm25Rank`/`fts5Phrase`/`fts5Rebuild`/
`fts5SyncTriggers`/`SqlIdent`) is **ticket 15's** and is *consumed, never
re-string-assembled* — if a fragment is missing, extend ticket 15's module (its
named revisit trigger), do not hand-build FTS5/identifier SQL here. The
`documents`/`chunks`/`collections` schema, `chunkBlocks`, `rebuildIndex`/
`syncDocument`/`indexDocument`, `listCollection`/`getDocument`/`searchIndex`,
and the delivery-API mount are **ticket 16's** — this ticket **adds a column and
a query function** to that package, it does **not** re-chunk, re-shape the
document/collection schema, or fork the ingest pipeline. The `Provider` sum,
`generateObject`, and the vendor request builders are **plgg-kit's existing
live seam** — this ticket adds an embeddings sibling in the same shape, it does
**not** introduce a second vendor abstraction. The Realtime/voice agent, the
ephemeral-key minting, `plgg-fetch` streaming, and the browser agent UI are
**ticket 25**. MCP exposure of the RAG tool is **tickets 26/27**. The Claude
Code plugin export is **ticket 30**.

## Policies

- `workaholic:design` / `policies/security.md` — an embeddings key is a
  **secret** and the RAG endpoint answers **untrusted** query text. Three
  boundaries enforced here: (a) **key handling** — the API key is resolved only
  through the plgg-kit seam's existing discipline (the provider's
  `Option<apiKey>` or `env("OPENAI_API_KEY")` via `generateObject`'s pattern),
  never logged, never returned to a client, never embedded in a served
  response; the ephemeral-key/browser path that *would* expose a short-lived
  key is **ticket 25's**, not this ticket's — the RAG endpoint here is
  server-side retrieval only. (b) **crash-safe query text** — the free-text `q`
  reaching the FTS5 half of `ragSearch` goes through ticket 15's `fts5Phrase`
  sanitizer (never a raw `MATCH`), exactly as ticket 16's `searchIndex` already
  does; the vector half never concatenates `q` into SQL at all (it embeds the
  text and compares numbers). (c) **bounded input** — `limit`/`topK` are parsed
  with plgg casters into bounded numbers (hard cap, Err on garbage), matching
  ticket 16's delivery-API posture, so a caller cannot request an unbounded
  cosine scan.
- `workaholic:implementation` / `policies/recovery.md` — **D4** (Git/filesystem
  primary, SQLite a *derived, rebuildable* index) still holds: an embedding is
  **derived** from the chunk text, so the embedding column is **rebuildable**
  (re-embed on `rebuildIndex`) and losing it costs only a re-embed, never
  corpus data. Embedding writes must be **transactional** (ticket 16's
  `transaction` step) and **idempotent** (re-embedding an unchanged chunk —
  same `content_hash`, ticket 16's skip lever — writes nothing). The system
  **self-heals by rebuild**: a dropped DB → one `rebuildIndex` (with a key set)
  → identical FTS5 index *and* repopulated embeddings; with **no** key → an
  identical FTS5 index and an empty embedding column that still serves search.
  The graceful-degradation path *is* a recoverability guarantee: the always-on
  BM25 baseline must never depend on the opt-in tier having run.
- `workaholic:implementation` / `policies/test.md` — the 90% four-metric
  coverage doctrine, co-located `.spec.ts` (flat `test()`, absolute imports),
  and "test against the real engine": embedding-storage and search specs run
  against **real `node:sqlite`** through plgg-sql's `Db` seam (the `Float32`
  BLOB round-trip must be proven on the real driver, not a mock), and the
  plgg-kit embeddings seam is tested with an **injected `post` fake** (no
  network) exactly as `generateObject`'s specs do. The **degraded path** (no
  key → FTS5 fallback → sane results) and the **cosine ordering** are enumerated
  as **required** specs, not left to line-count luck. `plgg-content` is gated
  ≥90 from birth (ticket 16); **plgg-kit currently ships with no
  `plgg-test.config.json`** (silently ungated — the exact D14 defect ticket 02
  hardens) — the embeddings module lands **with** a ≥90 config for plgg-kit (or
  after ticket 02 has already added one) so it is gated from its first commit.

## Key Files

- `packages/plgg-kit/src/LLMs/usecase/generateEmbedding.ts` (**new**) — the
  embeddings entry, mirroring
  `packages/plgg-kit/src/LLMs/usecase/generateObject.ts`: signature
  `({ provider, input, post = postJson }: { provider: Provider; input: string;
  post?: typeof postJson }): PromisedResult<ReadonlyArray<number>, unknown>`
  (a batch overload taking `ReadonlyArray<string>` → `ReadonlyArray<ReadonlyArray<number>>`
  is optional — decide in step 2). Resolves the key from `provider.content`'s
  `Option<apiKey>` else `env("OPENAI_API_KEY")` (the exact `isSome(apiKey) ? …`
  branch `generateObject` uses), then dispatches via exhaustive `match(provider)`
  over `openAI$()/anthropic$()/google$()` to the vendor builder. **No key
  resolvable → an `Err` on the `Result` channel** (never a throw) — the caller
  in plgg-content/plggpress reads that `Err` as "embeddings unavailable, use
  FTS5".
- `packages/plgg-kit/src/LLMs/vendor/OpenAI.ts` — add `reqEmbeddingGPT`
  beside `reqObjectGPT` (line 14): `POST https://api.openai.com/v1/embeddings`
  with `{ model, input }`, `Authorization: Bearer <apiKey>`, through the
  injectable `post`; decode `data[0].embedding` to `ReadonlyArray<number>` via
  `atProp`/`atIndex` + a numeric-array caster (the same decode discipline
  `reqObjectGPT` uses for `output[0].content[0].text`). Anthropic/Google vendor
  files (`Anthropic.ts`, `Google.ts`) get their embeddings builder only if their
  branch is exercised; an unsupported provider returns a typed `Err`, never a
  throw. **Vendor kept swappable** (D12): this file is the only place an
  embeddings HTTP endpoint appears.
- `packages/plgg-kit/src/LLMs/usecase/index.ts`, `src/LLMs/index.ts`,
  `src/index.ts` — barrels to extend with `generateEmbedding` in the existing
  `export * from …` style. plgg-kit's `exports` map already carries
  `types`+`default` under both `import` and `require`
  (`packages/plgg-kit/package.json`) — no export-map change needed (concern 51
  already satisfied for this package).
- `packages/plgg-kit/plgg-test.config.json` (**new, or delivered by ticket 02**)
  — a ≥90 four-metric threshold so the embeddings module is gated (D14: *"gate
  plgg-kit"*; the missing file today is the silent-ungating default ticket 02
  fixes). Verify it exists before merging; add it here if ticket 02 has not.
- `packages/plgg-content/src/Schema/usecase/contentMigrations.ts` — **ticket
  16's** index DDL; this ticket adds one migration appending an
  `embedding BLOB` column (nullable) and a `embedding_model TEXT` column to the
  `chunks(id, document_id, ordinal, heading_path, text)` table (ticket 16 step
  2), via a new `-- migrate:up/down` body through the same
  plgg-db-migration migrator — **not** a rewrite of ticket 16's migration.
  `heading_path`/`text` are untouched; the FTS5 external-content table over
  `chunks` is unchanged (embeddings are not an FTS column).
- `packages/plgg-content/src/Rag/` (**new** domain in the `model/`/`usecase/`
  shape): `model/Embedding.ts` (a `Float32Array`-backed vector value + its
  `BLOB` codec `toBlob`/`fromBlob` — `Float32Array` ↔ `Uint8Array`/`Buffer`
  via the buffer view, no `as`), `usecase/embedChunks.ts` (embed a document's
  chunks through the plgg-kit seam and store the BLOBs transactionally — a no-op
  that returns cleanly when the seam yields `Err`, i.e. no key), and
  `usecase/vectorSearch.ts` + `usecase/ragSearch.ts` (below). Lands beside
  ticket 16's `src/Ingest/`, `src/Query/`, `src/Schema/`.
- `packages/plgg-content/src/Rag/usecase/vectorSearch.ts` (**new**) — embed the
  query via `generateEmbedding`, load candidate chunk embeddings from the `Db`,
  compute **cosine similarity in plain JS** (dot / (‖a‖·‖b‖) over the
  `Float32Array`s), and return the top-k chunk ids ranked — the D11 "JS cosine
  top-k", no native/ANN dependency. Errors (no key, empty column) stay on the
  `Result` channel.
- `packages/plgg-content/src/Rag/usecase/ragSearch.ts` (**new**) — the **hybrid,
  gracefully-degrading** entry: if the query embeds (key present) **and** the
  chunk embedding column is populated, fuse vector top-k with ticket 16's FTS5
  `bm25Rank` (a simple, documented fusion — e.g. reciprocal-rank fusion or a
  weighted blend, justified in the spec); **otherwise fall back to ticket 16's
  `searchIndex` (FTS5/BM25) verbatim**. Returns the same `decodeRows`-typed
  chunk→document hit shape ticket 16's `searchIndex` returns, so the delivery
  layer and the agent/MCP consume one shape. HTTP-free (callable with just a
  `Db`).
- `packages/plgg-content/src/Query/usecase/searchIndex.ts` — **ticket 16's**
  FTS5/BM25 search; `ragSearch` calls it as the baseline and as the degraded
  fallback. Consumed, not modified.
- `packages/plgg-content/src/Ingest/usecase/rebuildIndex.ts`,
  `usecase/indexDocument.ts`, `usecase/syncDocument.ts`,
  `src/Ingest/model/Chunk.ts`, `src/Query/model/*` — **ticket 16's** ingest and
  chunk model; `embedChunks` is invoked *after* a document's chunks are written
  (same transaction or an idempotent follow-up keyed on `content_hash`).
  Chunk boundaries are **unchanged** (ticket 16's "keep `chunks` stable"). The
  `documents.content_hash` skip lever (ticket 16 step 4) makes re-embedding
  idempotent.
- `packages/plgg-sql/src/Fts5/` — **ticket 15's** FTS5 builders
  (`fts5Match`, `bm25Rank`, `fts5Phrase`, `fts5Rebuild`, `SqlIdent`/`identSql`);
  the FTS half of `ragSearch` emits SQL **only** through these. Consumed, not
  modified. The `Db`/`Sql` BLOB binding (`packages/plgg-sql/src/Db/model/Db.ts`,
  `src/Sql/model/Sql.ts`) is the seam the `Float32` BLOB is written/read
  through — a `Uint8Array`/`Buffer` binds as a SQLite BLOB parameter on
  `node:sqlite`; verify the seam passes it through (step 3) and extend ticket
  15's binding **only** if a real gap appears.
- `packages/plgg/src/Functionals/postJson.ts` — the injectable network seam
  (`postJson({ url, headers })(data)` → `Result`) the embeddings vendor builder
  threads; already `redirect: "manual"` so the `Authorization` header can't
  leak on a redirect (security policy). Consumed, not modified.
- `packages/plgg/src/Functionals/env.ts` — `env("OPENAI_API_KEY")` (returns a
  `Result`, the missing-key `Err` that drives graceful degradation). Consumed.
- `packages/plggpress/src/DeliveryApi/usecase/ingestFromConfig.ts`,
  `usecase/deliveryApi.ts`, `packages/plggpress/src/server/pressServer.ts` —
  **ticket 16's** ingest wiring, delivery sub-app, and the `pressServeWeb` mount
  seam. This ticket: (a) calls `embedChunks` from `ingestFromConfig` **only when
  a key is configured** (else skip — degraded ingest), and (b) exposes
  `ragSearch` as the retrieval endpoint (e.g. `GET /api/rag?q=…` or extends
  `/api/search`) at the **same** seam ticket 16 mounts on, and **only** there.
  Extended, not re-architected.
- `packages/plgg-content/example.ts` — ticket 16's runnable demo; extend with a
  RAG section that runs the **same** query twice (key set → hybrid; key unset →
  FTS5 fallback) proving both branches, the proof-of-value artifact.
- `packages/plgg-content/plgg-test.config.json` — ticket 16's ≥90 gate; the new
  `Rag/` modules clear it. `scripts/test-plgg-content.sh` (ticket 16) and
  `scripts/test-plgg-kit.sh` (`scripts/check-all.sh:30`) run the specs.
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the decision
  record (D11/D12 govern; spec line 105 is this ticket's phase gate; lines 111
  and 58 name the deferred ANN index and the Realtime split to ticket 25).

## Related History

- **Direct dependencies (this branch):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143016-plggpress-content-index-and-delivery-api.md`
  delivers the `plgg-content` package, the `documents`/`chunks`/`collections`
  schema, the heading-scoped chunker, `rebuildIndex`/`syncDocument`, and the
  FTS5-backed `searchIndex` this ticket extends — its Considerations name this
  exact hand-off: *"Chunk granularity is the RAG seam. Heading-scoped chunks are
  chosen so ticket 24 can attach a `Float32` embedding BLOB per chunk (D11's
  opt-in tier) without re-chunking. Keep `chunks` stable."* This ticket **is**
  that attachment.
  `.workaholic/tickets/todo/a-qmu-jp/20260704143015-plgg-sql-fts5-support.md`
  delivers the typed FTS5/BM25 vocabulary the fallback and the hybrid FTS half
  speak; its Considerations already defer *"embeddings/cosine top-k (roadmap
  ticket 24)"* to here and warn *"if ticket 16 finds itself string-assembling
  any FTS5 SQL, the vocabulary here is incomplete — extend this module"* — the
  same rule binds this ticket.
- **Vendor seam (this branch/existing):** `plgg-kit`'s live LLM seam —
  `packages/plgg-kit/src/LLMs/usecase/generateObject.ts` (the
  `Provider`-dispatch + injectable-`post` + `env` key-fallback pattern
  `generateEmbedding` mirrors), `src/LLMs/model/Provider.ts` (the
  `OpenAI | Anthropic | Google` sum, `openai()/anthropic()/google()`
  constructors, `Config { model, apiKey: Option<string> }`), and
  `src/LLMs/vendor/OpenAI.ts` (`reqObjectGPT`, the request/decode shape
  `reqEmbeddingGPT` copies). D12 settles that plgg-kit *"is LIVE"* and is the
  single vendor seam; the memory note
  `project_bundle_dynamic_import` records plgg-kit's ESM/require surface, and
  `feedback_vendor_neutrality_zero_new_deps` the zero-new-deps rule the OpenAI
  HTTP call honors (stdlib `fetch` via `postJson`, no vendor SDK).
- **Downstream consumers (not yet written):** ticket **25**
  (`…143025-realtime-voice-agent.md`, Phase 9 — the *other* half of D12:
  ephemeral-key minting in plgg-kit, `plgg-fetch` streaming, the browser voice
  loop, and the *agent-UI-hidden-with-no-key* half of the spec-line-105 gate)
  consumes this ticket's `ragSearch` retrieval endpoint as its tool-call
  target; tickets **26/27** (`plgg-mcp-*`) expose `ragSearch` as an MCP tool;
  ticket **30** (`claude-code-plugin-export`) references it from generated
  skills. **Note:** ticket 25's file, like this one, was enumerated in the
  roadmap (spec line 92) but not yet authored — flagged for the backlog, not
  this ticket's scope.
- **Constraints & memory:** `feedback_coverage_threshold` (>90% four-metric),
  `feedback_breaking_changes_ok` (plgg is its own only consumer — the
  `chunks`-column addition is a free migration), `project_str_over_softstr`
  (prefer `Str`/`asStr` in new code; the plgg-kit `Config` still uses `SoftStr`
  at its seam), and the roadmap's known constraints (spec lines 66-73): no
  native bindings (the `Float32` BLOB + JS cosine *is* the no-native-extension
  design), `node:sqlite` behind plgg-sql's `Db` seam as the only SQLite surface,
  no `as`/`any`/`ts-ignore`.

**Wiring note (load-bearing):** **no new package.** The work lands in two
already-wired packages — `plgg-kit`
(`scripts/build.sh:21`, `scripts/npm-install.sh:12`, `scripts/check-all.sh:30`)
and `plgg-content` (added by ticket 16 to `build.sh`/`npm-install.sh`/
`check-all.sh` before plggpress) — plus plggpress. So **no** new
`cd $REPO_ROOT/packages/<name> && npm run build` line enters `scripts/build.sh`/
`scripts/npm-install.sh` and **no** new `test-*.sh` enters
`scripts/check-all.sh`. Build order is already correct (plgg → plgg-kit …;
plgg → plgg-md → plgg-sql → plgg-db-migration → plgg-content → plggpress via
ticket 16); this ticket's job is to **verify** it, not change it. The one
packaging obligation is the plgg-kit `plgg-test.config.json` (D14) — a config,
not a script line. A fresh `check-all.sh` is the arbiter.

## Implementation Steps

1. **Confirm the seams exist (no code before this).** Verify on the branch that
   ticket 16 has landed `plgg-content` with `documents`/`chunks`/`collections`
   and `searchIndex` (FTS5/BM25), and ticket 15's `Fts5` builders are present;
   verify plgg-kit's `generateObject`/`Provider`/`reqObjectGPT` shape is
   unchanged. Confirm plgg-kit's coverage config: if
   `packages/plgg-kit/plgg-test.config.json` is still absent (D14 silent-ungating
   defect), add it (≥90 four-metric) as part of this ticket, else confirm ticket
   02 delivered it. Probe (and record in the PR) that a `Float32Array` serialized
   to a `Buffer`/`Uint8Array` binds and reads back **byte-identical** as a
   `BLOB` through plgg-sql's `Db` seam on `node:sqlite` (the storage premise of
   D11); if the `Db`/`Sql` binding does not pass a BLOB through, extend ticket
   15's binding minimally here and say so.
2. **plgg-kit embeddings seam (D12).** Add `reqEmbeddingGPT` to
   `src/LLMs/vendor/OpenAI.ts` (`POST /v1/embeddings`, `{ model, input }`,
   bearer auth, injectable `post`, decode `data[0].embedding` to a numeric array
   via `atProp`/`atIndex` + a numeric-array caster — no `as`). Add
   `src/LLMs/usecase/generateEmbedding.ts` mirroring `generateObject`: resolve
   the key (`provider` `Option<apiKey>` → `env` fallback), `match(provider)` to
   the vendor builder, **return `Err` when no key is resolvable** and for any
   provider whose embeddings builder is not implemented (typed, never a throw).
   Barrel it. Decide the batch overload now (embed N chunks in one request) if
   the vendor supports it. Specs use an **injected `post` fake** (no network),
   asserting request assembly, the numeric-vector decode, the no-key `Err`, and
   the unsupported-provider `Err`.
3. **Embedding value + BLOB codec (D11 storage).**
   `plgg-content/src/Rag/model/Embedding.ts`: a `Float32Array`-backed vector and
   `toBlob`/`fromBlob` (`Float32Array` ↔ `Uint8Array`/`Buffer` through the
   buffer view — no `as`, no native module). Spec: round-trip a vector to a
   BLOB and back through **real `node:sqlite`** and assert byte- and
   value-identity, plus a dimension-mismatch guard (comparing vectors of
   different length is a typed `Err`, not a NaN).
4. **Schema migration (extend ticket 16, don't rewrite).** Add a new
   plgg-db-migration `-- migrate:up/down` body to
   `plgg-content/src/Schema/usecase/contentMigrations.ts` adding
   `embedding BLOB` (nullable) and `embedding_model TEXT` to `chunks`; `down`
   drops them. Run through the same migrator. The FTS5 external-content table and
   `documents`/`collections` are untouched. Idempotent up (re-run is a no-op).
5. **`embedChunks` (opt-in, idempotent, transactional).**
   `plgg-content/src/Rag/usecase/embedChunks.ts`: for a document's chunks, call
   `generateEmbedding` through the plgg-kit seam; **on `Err` (no key) return
   cleanly having written nothing** (degraded ingest — the always-on FTS5 index
   is already built by ticket 16); on success store each chunk's `Float32` BLOB
   and `embedding_model` transactionally (plgg-sql `transaction`). Skip chunks
   already embedded for the current `content_hash` (ticket 16's skip lever) →
   idempotent. Wire it into ticket 16's `rebuildIndex`/`syncDocument` path as an
   **optional follow-up** that is a no-op with no key.
6. **`vectorSearch` (JS cosine top-k, D11).**
   `plgg-content/src/Rag/usecase/vectorSearch.ts`: embed the query via
   `generateEmbedding`; load candidate chunk embeddings from the `Db` (all, or a
   collection-scoped subset — bounded); compute **cosine similarity in plain
   JS** over the `Float32Array`s; return top-k chunk ids + scores ranked. No
   native/ANN dependency. `Err`/empty-column → typed result the caller degrades
   on. Spec: with a small fixed set of vectors, assert the returned order is the
   true cosine order (deterministic, no network — inject the query embedding or
   a `post` fake).
7. **`ragSearch` (hybrid + graceful degradation — the phase gate).**
   `plgg-content/src/Rag/usecase/ragSearch.ts`: if the query embeds (key
   present) **and** the embedding column is populated, fuse `vectorSearch`
   top-k with ticket 16's `bm25Rank`/`searchIndex` via a documented fusion
   (justify the fusion — e.g. RRF — in the spec); **otherwise call ticket 16's
   `searchIndex` (FTS5/BM25) verbatim** and return the same hit shape. HTTP-free.
   The FTS half emits SQL **only** through ticket 15's builders (`fts5Phrase`
   the untrusted `q`). Spec: **the required degraded-path test** — with the key
   env **unset** and no embeddings stored, `ragSearch` returns the FTS5/BM25
   hits (sane, ordered) identical to `searchIndex`; with the key set and
   embeddings present, it returns the fused ranking. Both branches proven.
8. **plggpress wiring.** In ticket 16's `ingestFromConfig`, call `embedChunks`
   **only when a key is configured** (probe the plgg-kit seam / `env` once at
   boot; no key → skip embedding, log "RAG embeddings disabled (no API key)").
   Expose `ragSearch` at the `pressServeWeb` seam (a `GET /api/rag?q=…` route,
   or extend ticket 16's `/api/search`) returning `jsonResponse`, `fts5Phrase`
   the `q`, cast/bound `limit`/`topK`, **only** at that seam. The SSG
   (`build`/`pressRouter`) render path stays byte-untouched (D5).
9. **Runnable demo (proof-of-value, working-style).** Extend
   `packages/plgg-content/example.ts`: ingest a few fixture docs, then run the
   **same** query (a) with a key set / injected embeddings → hybrid ranking, and
   (b) with the key unset → FTS5 fallback, printing both so the degradation is
   visible in one `proc` chain. Quote the output in the PR. Then a **served**
   smoke: `npx plggpress serve` on `packages/guide` with **no** key →
   `curl '…/api/rag?q=<term>'` returns sane FTS5 hits (the spec-line-105
   evidence); with a key → richer RAG hits.
10. **Specs** (co-located, flat `test()`, absolute imports, real `node:sqlite`;
    plgg-kit specs inject `post`): plgg-kit `generateEmbedding` (request
    assembly, vector decode, no-key `Err`, unsupported-provider `Err`); the
    `Embedding` BLOB round-trip + dimension guard on the real driver;
    `embedChunks` (stores on key, **no-op on no key**, idempotent by
    `content_hash`, transactional); `vectorSearch` (cosine ordering
    deterministic); **`ragSearch` degraded path (no key → FTS5 fallback, the
    Phase 8 gate) and hybrid path**; the plggpress route (`fts5Phrase` applied,
    bounded `limit`/`topK` → typed 400 on garbage, no key → FTS5 results).
11. **House rules end to end:** no `as`/`any`/`ts-ignore` (the `Float32`↔`BLOB`
    codec uses buffer views, not casts); `Option` not null/undefined, `Result`
    not throw; exhaustive `match` over `Provider` and every search-mode/degrade
    decision; data-last pipelines (`pipe`/`cast`/`proc`); prefer `Str`/`asStr`
    over `SoftStr` in new code where the seam allows; Prettier `printWidth: 50`
    per package; **zero new dependencies**, **no native bindings** (the whole
    D11 point — no `sqlite-vec`, no ANN lib; `node:sqlite` behind plgg-sql's
    `Db` seam is the only SQLite surface); **no new package**; FTS5 SQL only via
    ticket 15's builders; embeddings HTTP only via the plgg-kit vendor file.

## Quality Gate

**Acceptance criteria**

1. **Graceful degradation verified (Phase 8 gate, spec line 105):** with **no**
   API key configured, ingest stores **no** embeddings and `ragSearch` (and the
   served `/api/rag` route) returns **sane FTS5/BM25 results identical to ticket
   16's `searchIndex`** — a spec runs with the key env unset and asserts the
   fallback ranking; the always-on baseline never depends on the opt-in tier
   having run.
2. **Opt-in embeddings tier works (D11):** with a key (or an injected `post`),
   ingest stores a `Float32` BLOB per chunk, `vectorSearch` returns the correct
   **JS cosine** top-k order (a spec asserts the true cosine order on fixed
   vectors), and `ragSearch` returns a fused hybrid ranking.
3. **Zero-dependency purism honored (D11):** `grep` finds **no** `sqlite-vec`,
   no native extension load, no ANN/vector library, and no new dependency in any
   `package.json`; the embedding is a `Float32Array`↔`BLOB` round-trip proven
   byte-identical on **real `node:sqlite`**, and top-k is plain-JS cosine.
4. **Single vendor seam (D12):** every text→vector call goes through
   `plgg-kit`'s `generateEmbedding`; `grep` finds no embeddings HTTP endpoint or
   vendor SDK outside `packages/plgg-kit/src/LLMs/vendor/`; the seam resolves the
   key exactly as `generateObject` does and returns a typed `Err` (never a
   throw) when no key is resolvable.
5. **No FTS5/identifier SQL hand-assembled:** the FTS half of `ragSearch` emits
   SQL only through ticket 15's `fts5Match`/`bm25Rank`/`fts5Phrase`/`SqlIdent`;
   `grep` finds no hand-built `MATCH`/`fts5`/`bm25` strings and no identifier
   reaching SQL except via `SqlIdent`.
6. **Derived, rebuildable, idempotent (D4/recovery):** embeddings are rebuilt by
   `rebuildIndex` (with a key) and re-embedding an unchanged chunk (same
   `content_hash`) writes nothing; every embedding write is transactional (no
   partial state observable); a dropped DB rebuilds to an identical FTS5 index
   with or without a key.
7. **Crash-safe, bounded retrieval (security):** hostile `q` never throws (via
   `fts5Phrase`); `limit`/`topK` out of range or non-numeric yield a typed 400
   and are hard-capped; the API key is never logged or returned in a response.
8. **Ticket 16 not forked:** `chunks` boundaries/`chunkBlocks`, the
   `documents`/`collections` schema, and `searchIndex` are unchanged; this ticket
   adds a column and a `Rag/` domain only. SSG output is byte-identical
   before/after (empty `diff -r`).
9. **No escape hatches, no new package, coverage:** `grep` finds no
   `as `/`any`/`ts-ignore` in new modules; **plgg-kit is gated ≥90** (its
   `plgg-test.config.json` exists — D14) and clears it; `plgg-content` and
   plggpress stay ≥90 on all four metrics; no new package (no new `cd`/`test-*`
   line) and the existing build order holds; a fresh `check-all.sh` is green.

**Verification method**

Run `scripts/tsc-plgg.sh` (clean), `scripts/test-plgg-kit.sh`,
`scripts/test-plgg-content.sh`, and `scripts/test-plggpress.sh` and paste the
gate lines (including the **no-key FTS5-fallback** spec and the cosine-ordering
spec). Run `npx tsx packages/plgg-content/example.ts` and show **both** the
hybrid and the FTS5-fallback query output. Served smoke on `packages/guide`:
`npx plggpress serve --port <p>` with **no** key set, then
`curl -s 'http://localhost:<p>/api/rag?q=<term>'` returns sane FTS5 hits (the
spec-line-105 degraded-behavior evidence); repeat with a key for the RAG
branch. Byte-identity: `npx plggpress build` into two dirs before/after and
paste the empty `diff -r`. Then a **fresh** `scripts/check-all.sh` (clean
rebuild — stale dists must not mask the plgg-kit / plgg-content / plggpress
edges or the new `chunks` column) must be green end to end.

**Gate**

All nine acceptance criteria hold objectively AND the fresh `check-all.sh` is
green AND the no-key degraded path returns sane FTS5 results (the Phase 8 gate).
Any `sqlite-vec`/native extension, any ANN/vector dependency, any new
dependency, any new package, any hand-assembled FTS5/identifier SQL, an
embeddings HTTP call outside the plgg-kit vendor file, a search path that throws
or fails when no key is configured (degradation broken), a mutated ticket-16
chunk/schema, an ungated plgg-kit, an escape hatch, or a coverage dip fails the
ticket.

## Considerations

- **In-house ANN index is deferred (D11 revisit trigger, spec line 111).** JS
  cosine over all candidate chunks is O(n·d) per query — fine at the guide/qmu
  corpus scale, the deliberate zero-dependency choice. If a consumer's corpus
  grows past what a linear scan serves acceptably, the escalation is an **in-house
  ANN index** (the spec's named deferred item), **not** `sqlite-vec` or a native
  library. Record the trigger firing rather than reaching for a native extension.
- **Realtime voice agent and ephemeral keys are ticket 25 (the other half of
  D12).** This ticket delivers **server-side retrieval** (`ragSearch`) and its
  HTTP endpoint; it does **not** mint ephemeral browser keys, add `plgg-fetch`
  streaming, or build the agent UI. The *agent-UI-hidden-with-no-key* half of
  spec line 105 is ticket 25's gate; this ticket owns only the FTS5-fallback
  half. Keep the RAG endpoint agent-agnostic so ticket 25 wires the browser
  agent to it as a plain tool-call target.
- **Embedding-model drift.** The stored `embedding_model` column exists so a
  later model/dimension change is detectable: vectors embedded with a different
  model are not comparable. If the configured model changes, `rebuildIndex`
  re-embeds (D4: derived and rebuildable); `vectorSearch` must guard a
  dimension mismatch as a typed `Err`, never a silent NaN ranking. Cross-model
  migration niceties beyond re-embed are out of scope until a consumer needs
  them.
- **Provider coverage.** OpenAI embeddings is the first (and, for the guide,
  sufficient) vendor. Anthropic/Google embeddings builders are added only when a
  consumer selects them; until then those `Provider` branches return a typed
  `Err` (surfaced as graceful degradation), never a throw — consistent with the
  no-key path. This keeps D12's "vendor swappable behind the seam" honest without
  speculatively implementing unused vendors.
- **Fusion strategy is a tunable, not a schema.** The hybrid vector+BM25 fusion
  (weighting/RRF) is a `ragSearch` parameter; if a consumer wants a different
  blend it is a function argument, not an index change. Keep `chunks` and the
  embedding column stable (ticket 16's contract).
- **Key configuration & re-embed timing on the served instance.** Embeddings are
  generated at ingest (boot) when a key is present; turning a key **on** later
  requires a re-ingest/`rebuildIndex` to populate the column (the served
  instance built its index at boot — concern `51-hot-reload-does-not-refresh-config`;
  a watcher/reload is ticket 28's, not this ticket's). Note the boundary in the
  ingest docstring so an operator knows enabling embeddings needs a rebuild, not
  just a restart.
- **plgg-kit gating is a D14 obligation surfaced here.** plgg-kit ships today
  with **no** `plgg-test.config.json` (silently ungated — the exact default
  ticket 02 hardens). Adding the live embeddings seam to an ungated package is
  unacceptable; this ticket ensures plgg-kit is gated ≥90 (adding the config if
  ticket 02 has not), so the new vendor code is covered from its first commit.
