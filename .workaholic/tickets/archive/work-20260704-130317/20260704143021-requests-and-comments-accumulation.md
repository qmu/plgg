---
created_at: 2026-07-04T14:30:21+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, DB, UX]
effort:
commit_hash: d866f05
category: Changed
depends_on: [20260704143016-plggpress-content-index-and-delivery-api.md, 20260704143019-plggpress-oidc-rp-integration.md]
---

# Stakeholder accumulation: a **DB-primary, durable** conversation store (requests / comments / threads) attached to content, a guest submission surface, admin lifecycle views, a written transcript-ingestion contract for the voice agent, and a visibility-gated feed into the RAG index

## Overview

Phase 7 (Collaboration), ticket **21** of the plggpress/plggmatic roadmap —
the phase that turns plggpress from a publish-only CMS into a place where
project stakeholders *accumulate*. Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

This is the pillar the vision describes (author's words, condensed): plggpress
adds *"sign-in via plgg-auth (admin publishers AND invited 'collaborative
guest' project stakeholders) … a conversational browser agent using the OpenAI
Realtime API (user speaks → agent searches the RAG DB → answers), **so
stakeholder interactions accumulate inside plggpress**."* This ticket builds
the accumulation store and its human surfaces (web submission + admin
management); the voice agent that also writes into it is phase 9 (ticket 25),
and this ticket's job is to give ticket 25 a store and a **written ingestion
contract** to land in.

The governing decision is **D4**, transcribed here so an implementer need not
open the spec: *"Content source of truth — **Git/filesystem primary, SQLite is
a derived, rebuildable index.** RAG, search, **requests/comments live DB-only.**
Revisit SQLite-primary only when guest web editing of articles ships."* Read
this carefully against ticket 16: ticket 16's content index is **derived and
rebuildable** — *"losing the database costs nothing but a rebuild"*, and its
recovery contract is literally *"a dropped DB → one `rebuildIndex` → identical
index."* **Requests/comments are the exact opposite.** They are **DB-primary,
author-created, irreplaceable** data with no git source to rebuild from. This
inverts ticket 16's every recoverability assumption: the stakeholder store must
be treated as **primary durable state** — reversible schema migrations (never
drop-and-recreate), a backup posture, and — critically — it must live where
**ticket 16's `rebuildIndex` can never wipe it**. Sharing ticket 16's
disposable index file would mean a routine "drop the DB and rebuild" recovery
drill *destroys real stakeholder data*. That single constraint drives the whole
placement decision below.

Two further decisions frame the feed into search. From the vision: *"automatic
SQLite-based RAG indexing of **all content**"*; and **D11**: *"always-on
baseline = SQLite FTS5 (BM25); opt-in embeddings = BLOB Float32 + JS cosine
top-k."* **Feed-into-RAG decision, recorded here (default: YES — stakeholder
messages are indexed like content chunks).** So the voice agent (which *"searches
the RAG DB"*) and the `/api/search` endpoint surface accumulated stakeholder
knowledge alongside articles. But the RAG index is ticket 16's **derived**
store and `/api/search` answers **anonymous public** GETs, whereas a request may
be a private guest-to-admin conversation. Therefore the feed is **visibility-
gated**: the durable store is primary; only **public** conversations are
*projected* into the derived index (as synthetic documents + chunks, rebuilt
from the durable store on every `rebuildIndex`); **private** conversations stay
durable-store-only and never reach anonymous search. Indexing without a
visibility gate would be a data-leak, so the gate is a hard acceptance
criterion, not a nicety.

Auth is the other axis. Per the vision and **D6/D7**, submission is for
*invited* collaborative guests (not anonymous public — an anonymous comment box
is a spam/abuse surface), and management is admin-only. This ticket therefore
sits on **ticket 19** for the session, the generic `requireRole` guard, and the
CSRF middleware; guest submission is `requireRole(r => r === "guest" || r ===
"admin")` + CSRF, admin management is `requireRole(r => r === "admin")` + CSRF.

Scope guardrails (siblings own the rest): **guest article editing / revisions**
is **ticket 22** — this ticket's guests write *conversations about* content, not
the content itself (that stays git-primary per D4 until ticket 22's revisit
trigger). **Media/asset upload** is **ticket 23** — no file-input control here
(text messages only). **Opt-in embeddings / cosine top-k** over the projected
chunks are **ticket 24** — this ticket feeds the FTS5 baseline (D11's always-on
tier) and leaves the embedding BLOB to 24. The **realtime voice agent** is
**ticket 25** (phase 9, not yet ticketed) — this ticket ships the `recordMessage`
ingestion seam it calls and the written contract it conforms to, and nothing
of the Realtime/ephemeral-key machinery. The **content index, delivery API,
chunker, FTS5 builders, and the `pressServeWeb` mount seam** are **ticket 16 /
ticket 15 / ticket 14** — consumed, not reimplemented (in particular this
ticket must **not** hand-assemble FTS5 SQL — it projects into ticket 16's
`chunks`/`documents` via ticket 16's ingest functions, which already speak
ticket 15's builders).

## Policies

- `workaholic:implementation` / `policies/recovery.md` — **the load-bearing
  policy for this ticket, and the one it most changes.** The policy today records
  *"plgg contains no persistent data stores … no databases … all runtime state
  is ephemeral"* and *"The project's authoritative source of truth is the git
  repository itself."* Ticket 16 kept that true (its index is derived from git).
  **This ticket introduces the monorepo's first git-unbacked, author-primary
  persistent store** — the one place where *"losing the database"* is a real data
  loss, not a rebuild. It therefore must supply what the policy notes are absent
  ("Backup automation: not observed", "Migration tooling: not observed",
  "Rollback procedure: not observed") *at the design level*: **reversible
  `plgg-db-migration` migrations** (up **and** down — not ticket 16's one-shot
  `execScript` DDL, not drop-and-recreate), a **stated backup requirement** with
  the store file **path-parameterized** so ticket 28 can wire the actual
  snapshot/restore drill, and an explicit invariant that **ticket 16's
  `rebuildIndex` never touches the stakeholder tables** (they live in their own
  durable Db, separate from the disposable index). Recoverability of the derived
  RAG projection remains ticket 16's "rebuild from source" — here the *source*
  the projection rebuilds from is the durable stakeholder store, so the two
  recovery models compose (durable primary → derived projection).
- `workaholic:design` / `policies/security.md` — this surface accepts
  **authenticated but untrusted user-generated content** and exposes admin
  mutations. The policy's disciplines apply: (a) the submitted `body`, `kind`,
  `contentPath`, and every query parameter (`status`, `limit`, `offset`) are
  parsed through plgg casters into closed unions / bounded numbers — an invalid
  `kind`/`status` is an `Err`, not a stored-garbage row; `limit` is hard-capped;
  no parameter is interpolated into SQL (every value `sql`-bound, mirroring
  plgg-auth's `sqlStore`). (b) **Every state-changing POST is CSRF-protected**
  (ticket 19's `requireCsrf`) — submission, reply, and lifecycle transitions.
  (c) **Authorization never fails open**: guest submission requires a guest/admin
  session, admin management requires `roleOf(subject) === "admin"`, both via
  ticket 19's `requireRole` with exhaustive `match` and no default-allow branch.
  (d) **The visibility gate is a security boundary**: private conversations must
  never be projected into the anonymous-readable RAG/search index — a spec
  asserts a private thread is unreachable via `/api/search`. (e) Stored bodies
  are treated as data, never as trusted markup on render (escape at the view
  boundary; the SSG/reader path renders none of this).
- `workaholic:implementation` / `policies/quality.md` — TypeScript strict mode
  is the sole static-analysis layer; `as`/`any`/`ts-ignore` are prohibited. The
  `ConversationKind`, `ConversationStatus`, `MessageSource`, `AuthorKind`, and
  `Visibility` unions are closed and consumed with exhaustive `match`, so an
  unhandled kind, an illegal status transition, or a new source is a `tsc`
  error — load-bearing because the lifecycle state machine and the visibility
  gate are correctness/security-critical. Prettier `printWidth: 50` governs every
  touched `.ts`.
- `workaholic:implementation` / `policies/test.md` — the >90 four-metric coverage
  doctrine and "test against the real engine": the durable store specs run
  against real `node:sqlite` (Node ≥22.6) through plgg-sql's `Db` seam and
  `plgg-db-migration`'s migrator (the same harness ticket 16 / plgg-auth use),
  and the reversible migrations are exercised **up then down then up** to prove
  they are real rollbacks. The lifecycle transition matrix, the CSRF
  accept/reject paths, the authorization matrix (anonymous / guest / admin ×
  every route), and the visibility gate (private thread absent from public
  search) are enumerated as **required** specs. New code is gated **≥90 from day
  one** (D14; ticket 02 makes a missing `plgg-test.config.json` a hard failure).
- `workaholic:operation` / `policies/delivery.md` — **applies only on the
  new-package contingency** (below). If the design chooses `plgg-collab` over an
  in-`plgg-content` feature, the policy's rule that `scripts/build.sh` is
  *publish-order authority* (order is sed-derived from the exact
  `cd $REPO_ROOT/packages/<name> && npm run build` lines) requires the new
  package wired into `build.sh` (after `plgg-sql`/`plgg-db-migration`/
  `plgg-content`, before plggpress), `npm-install.sh`, and a
  `test-plgg-collab.sh` in `check-all.sh`. On the in-`plgg-content` default, no
  runner script changes.

## Key Files

**Delivered by dependencies (consume; do not reimplement):**

- `packages/plgg-content/` — ticket **16**'s package (its `Db` seam, `openIndex`,
  the `documents`/`chunks`/`collections` schema, and the query functions
  `listCollection`/`getDocument`/`searchIndex`/`listCollections`). The
  stakeholder domain is added **beside** ticket 16's derived index as a **durable,
  separately-migrated** domain — recommended default placement (design step
  decides). The **RAG feed** projects public conversations into ticket 16's
  `documents`/`chunks` via ticket 16's ingest usecases
  (`src/Ingest/usecase/indexDocument.ts`, `rebuildIndex.ts`, `syncDocument.ts`)
  — never by hand-writing FTS5/index SQL.
- `packages/plgg-content/src/Query/model/CollectionSchema.ts` — ticket 16 was
  asked (its Considerations) to *"model `CollectionSchema` so a `visibility` field
  can be added without reshaping the API"* — this ticket is the consumer that
  earns that field; the projected `conversations` collection carries visibility.
- `packages/plggpress/src/server/pressServer.ts` — ticket **14**'s `pressServeWeb`
  mount seam, where ticket 16 mounts `/api` and ticket 19 mounts `/auth`+`/admin`.
  This ticket adds the guarded guest-submission and admin sub-app mounts here
  **and only here** (the seam's stated purpose).
- `packages/plggpress/src/DeliveryApi/` — ticket 16's plggpress-side ingest
  adapter (`ingestFromConfig.ts`); this ticket extends the boot/ingest wiring to
  **also** project public conversations from the durable store into the index
  (see Implementation Steps §7), keeping `plgg-content` HTTP-free and
  plggpress-agnostic.
- `packages/plgg-auth/src/Account/usecase/roleOf.ts` — ticket **18**'s
  instantly-revocable `roleOf(subject) → Option<Role>` over the closed
  `Role = "admin" | "guest"`; the guard's decision source (via ticket 19).
- ticket **19**'s deliverables (created by that ticket, consumed here): the RP
  session reader, `packages/plgg-server/src/Routing/usecase/requireRole.ts`
  (generic, auth-agnostic; resolver injected) and
  `.../csrf.ts` (`requireCsrf`, `issueCsrfToken`). Consumed, not modified.

**Existing repo seams (consume; verified to exist):**

- `packages/plgg-sql/src/Db/model/Db.ts` — `Db` (`all`/`run`/`execScript`/
  `begin`/`commit`/`rollback`); the durable store opens its own `Db` handle over
  a separate SQLite file. `packages/plgg-sql/example.ts` — the `node:sqlite`
  `open` seam to mirror for the store's `open*` and its specs.
- `packages/plgg-db-migration/src/domain/usecase/migrateUp.ts` (`migrateUp`,
  line 58) + `packages/plgg-db-migration/src/testkit/migrator.ts`,
  `.../sqliteDb.ts` — the **reversible** migration engine and harness the durable
  schema rides (up/down bodies, not one-shot `execScript`).
- `packages/plgg-server/src/Routing/model/Web.ts` — `web()` (line 36),
  `get` (56), `use` (90), `route(basePath, sub)` (118); the guest/admin sub-apps
  are built from these and mounted with prefix-scoped guards.
- `packages/plgg-http/src/Http/model/HttpResponse.ts` — `jsonResponse` (line 91),
  the JSON responses admin list/detail return;
  `packages/plgg-http/src/Http/model/HttpRequest.ts` — `getQuery` (line 65) for
  `status`/`limit`/`offset`; `packages/plgg-http/src/Http/model/Form.ts` —
  `parseForm` (line 47) for the submission/transition POST bodies;
  `packages/plgg-http/src/Http/model/Cookie.ts` — `getCookie` for the session read
  the guard performs.
- `packages/plgg-md/src/Block/model/Block.ts` + `.../usecase/parseBlocks.ts` —
  if a message body is Markdown, the RAG projection reuses ticket 16's chunker
  over these; plain-text messages project as a single chunk. Consumed via
  ticket 16's ingest, not re-parsed here.
- `packages/plgg-auth/src/Oidc/model/AuthStore.ts` — the seam-as-a-type +
  atomic-`take*` precedent the `StakeholderStore` shape and its transactional
  writes mirror.

**Files created (recommended in-`plgg-content` placement; design step confirms):**

- `packages/plgg-content/src/Stakeholder/model/Conversation.ts` — `Conversation`
  (`id`, `contentPath: Option<Str>`, `kind`, `status`, `visibility`,
  `createdBy: Option<Subject>`, `source`, `createdAt`, `updatedAt`) + brands.
- `.../model/Message.ts` — `Message` (`id`, `conversationId`, `authorSubject:
  Option<Subject>`, `authorKind`, `body: Str`, `source`, `createdAt`).
- `.../model/ConversationKind.ts` (`"request" | "comment" | "question"`),
  `.../model/ConversationStatus.ts` (`"open" | "addressed" | "closed"`),
  `.../model/MessageSource.ts` (`"web" | "voice"`),
  `.../model/AuthorKind.ts` (`"guest" | "admin" | "agent"`),
  `.../model/Visibility.ts` (`"public" | "private"`) — each a closed union with an
  `as*` caster and an exhaustive matcher.
- `.../model/Ingestion.ts` — **the written ingestion contract**: the `IngestMessage`
  input type and the documented invariants (below) that both the web route and
  the ticket-25 voice pipeline satisfy.
- `.../model/StakeholderStore.ts` — the persistence seam over a durable `Db`.
- `.../usecase/openStakeholderStore.ts` — open the durable `Db` (separate file,
  path-parameterized) and `migrateUp` its reversible migrations.
- `.../usecase/stakeholderMigrations.ts` — the `-- migrate:up/down` reversible
  migration bodies (contrast ticket 16's `execScript` one-shot DDL).
- `.../usecase/openConversation.ts`, `.../usecase/recordMessage.ts` (the ingestion
  seam ticket 25 calls), `.../usecase/listConversations.ts`,
  `.../usecase/getConversation.ts`, `.../usecase/transitionStatus.ts`.
- `.../Sql/stakeholderStore.ts`, `.../Sql/stakeholderRows.ts` — the plgg-sql-backed
  driver + row casters (mirror plgg-auth `Sql/sqlStore.ts` / `Sql/rows.ts`).
- `.../testkit/memoryStakeholderStore.ts` — in-memory driver for pure specs.
- `.../index.ts` — feature barrel, wired into `packages/plgg-content/src/index.ts`
  (keep the `types`+`default` export map, concern 51).
- `packages/plggpress/src/Collab/usecase/guestThreadsApi.ts` — the guest-submission
  `Web` sub-app (open thread / append message), `requireRole(guest|admin)` +
  `requireCsrf`.
- `packages/plggpress/src/Collab/usecase/adminThreadsApi.ts` — the admin
  management sub-app (list/detail/transition/reply), `requireRole(admin)` +
  `requireCsrf`.
- `packages/plggpress/src/Collab/usecase/projectStakeholderIndex.ts` — the
  visibility-gated projection of public conversations into ticket 16's index
  (via `rebuildIndex`/`syncDocument`).
- Colocated `.spec.ts` beside every module above; `example.ts` demo additions.

**Wiring (verify — in-`plgg-content` default touches NO runner script):**

- `scripts/build.sh` / `scripts/npm-install.sh` / `scripts/check-all.sh` —
  `plgg-content` (ticket 16) is assumed already wired before plggpress; the
  in-package placement adds no `cd`-line. **Contingency (new `plgg-collab`
  package only):** add the exact `cd $REPO_ROOT/packages/plgg-collab && npm run
  build` line to `build.sh` (after `plgg-sql`/`plgg-db-migration`/`plgg-content`,
  before plggpress — publish order is sed-derived from it), a matching
  `npm install` line, `./scripts/test-plgg-collab.sh` in `check-all.sh`, and the
  per-package scripts + `plgg-test.config.json` (threshold 90).
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`,
  `.workaholic/policies/recovery.md` — the decision record and the policy this
  ticket updates the reality behind.

## Related History

- **Direct dependencies (this branch):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143016-plggpress-content-index-and-delivery-api.md`
  delivers `plgg-content` (the `Db` seam, the derived `documents`/`chunks`/FTS5
  index, the query functions, and the `ingestFromConfig` adapter). This ticket
  adds a **durable** sibling domain and reuses ticket 16's ingest to project the
  RAG feed; it honors ticket 16's own hand-off that `CollectionSchema` be shaped
  so a `visibility` field can be added *"without reshaping the API"*, and it must
  not string-assemble FTS5 SQL (ticket 16's/15's revisit trigger).
  `.workaholic/tickets/todo/a-qmu-jp/20260704143019-plggpress-oidc-rp-integration.md`
  delivers the RP session, the generic `requireRole`/`requireScope`, and the
  `requireCsrf` middleware; this ticket **consumes** them to guard the guest and
  admin surfaces — it does not re-issue cookies or re-implement CSRF.
- **Transitive foundation:**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143018-account-domain-roles-and-invites.md`
  (`roleOf`, the closed `Role`, invite-provisioned guests — the "invited
  collaborative guest" the vision names);
  `…143014-plggpress-serve-mode-dual-config.md` (the `pressServeWeb` mount seam
  and dual-mode topology — the SSG reader stays byte-untouched);
  `…143015-plgg-sql-fts5-support.md` (the FTS5 builders ticket 16's ingest uses,
  reached only through ticket 16 here).
- `.workaholic/tickets/archive/work-20260627-205005/20260627210146-scaffold-plgg-db-migration-package.md`
  and `…/20260627210145-plgg-sql-execscript-seam.md` (story
  `.workaholic/stories/work-20260627-205005.md`) — the reversible migration
  engine the durable store rides; unlike ticket 16's disposable index, this store
  uses **up/down** migrations because it holds primary data that must survive
  schema evolution.
- `.workaholic/tickets/archive/work-20260703-220007/20260703222255-plgg-auth-persistence-and-hardening.md`
  (story `.workaholic/stories/work-20260703-220007.md`) — the atomic `take*` /
  `sqlStore` / row-caster discipline the `StakeholderStore` driver copies (bound
  values, mis-shaped row → `None`, transactional writes).
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (story `.workaholic/stories/work-20260703-184443.md`) — the precedent for
  plggpress taking direct `file:` plgg-* deps and for a `src/<Feature>/` layout;
  `Collab/` lands beside `DeliveryApi/`/`auth/`.
- **Concern 51** (`.workaholic/concerns/51-plggpress-exports-map-is-import-only.md`)
  — the require()-compat export-map lesson the new `plgg-content` barrel widening
  (or the new `plgg-collab` package) must honor. **Concern**
  `.workaholic/concerns/51-hot-reload-does-not-refresh-config.md` — hot reload
  does not refresh config; the projection is re-run at boot / on write, not by a
  watcher (see Considerations). **Sibling ticket 02**
  (`…143002-harden-coverage-gate-defaults.md`) makes the ≥90 gate load-bearing.
- **Downstream:** ticket 22 (guest article editing — the D4 revisit trigger for
  SQLite-primary content), ticket 23 (media/attachments on messages), ticket 24
  (embeddings over the projected chunks), and ticket 25 (the voice agent that
  writes transcripts through this ticket's `recordMessage` contract).

## Implementation Steps

1. **Design step (mandatory, before any `src/` edit).** Record, in the PR
   description or a short `.workaholic/specs/` sketch: (a) the **placement
   decision** — recommended default a **`Stakeholder/` feature inside
   `plgg-content`** backed by a **separate durable `Db` (its own SQLite file)**
   that ticket 16's `rebuildIndex` never touches (reuses `plgg-content`'s
   `plgg-sql`/`plgg-db-migration` deps and the projection path, adds no package);
   contingency **new `plgg-collab` package** (fully specified in Key Files) if the
   design wants a hard package boundary — with rationale. (b) The **entity
   model** — the closed `ConversationKind`/`ConversationStatus`/`MessageSource`/
   `AuthorKind`/`Visibility` unions, and the linkage rule: a conversation links to
   an article by its **durable content path** (`contentPath`), **not** by a
   foreign key into ticket 16's derived `documents.id` (which is disposable and
   re-numbered on rebuild). (c) The **lifecycle state machine** — the legal
   `status` transitions (`open → addressed`, `addressed → open`,
   `open|addressed → closed`, `closed → open` reopen) as an exhaustive-`match`
   function that rejects illegal transitions with a typed `Err`. (d) The
   **feed-into-RAG decision** — default YES, **visibility-gated**: only `public`
   conversations project into the index; private stay durable-only. (e) The
   **backup/durability posture** — reversible migrations, path-parameterized
   store file, the rebuild-never-wipes invariant; at-rest backup/restore drill
   delegated to ticket 28. Present at the drive approval gate; implement after
   agreement.

2. **Models** (`Stakeholder/model/`). Author the five closed unions with `as*`
   casters (`Err` on anything outside the set — never a stored-garbage row) and
   exhaustive matchers. `Conversation` and `Message` are pure data (construction
   performs nothing); `contentPath` and `createdBy` are `Option`. Write
   `Ingestion.ts` — the `IngestMessage` input type (`conversationRef:
   { existing: id } | { new: { contentPath?, kind, visibility } }`,
   `body: Str`, `authorKind`, `authorSubject: Option<Subject>`, `source`) — and
   the **written contract** as its docstring (Implementation Step 6 fixes the
   invariants).

3. **Durable schema via reversible migrations** (`usecase/stakeholderMigrations.ts`,
   `usecase/openStakeholderStore.ts`). Author `-- migrate:up` / `-- migrate:down`
   bodies (NOT one-shot `execScript`, NOT drop-and-recreate — this is primary
   data):
   - `conversations (id INTEGER PRIMARY KEY, content_path TEXT, kind TEXT NOT
     NULL, status TEXT NOT NULL DEFAULT 'open', visibility TEXT NOT NULL DEFAULT
     'private', created_by TEXT, source TEXT NOT NULL, created_at INTEGER NOT
     NULL, updated_at INTEGER NOT NULL)`.
   - `messages (id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL
     REFERENCES conversations(id) ON DELETE CASCADE, author_subject TEXT,
     author_kind TEXT NOT NULL, body TEXT NOT NULL, source TEXT NOT NULL,
     created_at INTEGER NOT NULL)`.
   - Indexes on `conversations(status)` and `conversations(content_path)` for the
     admin/article filters.
   `openStakeholderStore(path)` opens a **separate** `node:sqlite`-backed `Db`
   (mirroring `plgg-sql/example.ts`, path-parameterized), runs `migrateUp` via the
   migrator, returns a ready handle. **Never** the same file as ticket 16's index.

4. **`StakeholderStore` seam + driver** (`model/StakeholderStore.ts`,
   `Sql/stakeholderStore.ts`, `Sql/stakeholderRows.ts`). Declare the seam
   (`saveConversation`, `findConversation`, `listConversations`, `saveMessage`,
   `listMessages`, `updateStatus`) in the `AuthStore` shape; implement over `Db`
   with every value `sql`-bound and every row decoded through casters (mirror
   plgg-auth `Sql/rows.ts`: a mis-shaped row reads as `None`, no `as`). Writes
   that touch two rows (open conversation + first message, or transition +
   `updated_at`) run in one `begin`/`commit`/rollback transaction. Add
   `testkit/memoryStakeholderStore.ts`.

5. **Domain usecases** (`usecase/`), each `Db`/store-taking, returning
   `PromisedResult`:
   - `openConversation(store)(input)` — create a conversation (+ optional first
     message) transactionally; casts `kind`/`visibility`/`contentPath`.
   - `listConversations(store)(filter)` — `{ status?, contentPath?, visibility?,
     limit, offset }`, `limit` bounded/hard-capped, returns `{ items,
     totalCount }`.
   - `getConversation(store)(id)` — `Option<{ conversation, messages }>` (HTTP
     maps `None` → 404).
   - `transitionStatus(store, clock)(id, to)` — apply the exhaustive-`match`
     transition function; illegal transition → typed `Err`; bumps `updated_at`.
   - `recordMessage(store, clock)(ingest)` — the **ingestion seam** (below).

6. **The written ingestion contract** (`model/Ingestion.ts` + `recordMessage`).
   Fix and document these invariants so **ticket 25's voice transcripts land in
   the same store with no new path**: (i) a transcript turn is **one
   `IngestMessage`** with `source: "voice"`, `authorKind: "agent"` for the
   agent's turns and `"guest"` for the human's, carrying the resolved `Subject`
   when the speaker is an authenticated guest; (ii) `conversationRef` either
   appends to an existing conversation or opens a new one (a voice session ⇒ one
   conversation, its turns ⇒ ordered messages); (iii) `body` is plain text (or
   Markdown), always stored verbatim as data; (iv) `visibility` defaults to
   `private` and is set at conversation open, never per-message (so the gate is
   decidable at the conversation level); (v) `recordMessage` is the **single
   writer** — the web route and the voice pipeline both call it, so ordering,
   `created_at`, and the transactional append are identical. `recordMessage`
   returns the stored `Message` (and, on a public conversation, triggers the
   incremental projection of §7).

7. **Visibility-gated RAG projection**
   (`packages/plggpress/src/Collab/usecase/projectStakeholderIndex.ts`). Read
   **public** conversations from the durable store and project each into ticket
   16's derived index as a synthetic document — `collection: "conversations"`,
   `path: "conversation:/<id>"`, `title` from the conversation subject/first
   line — with its messages chunked into ticket 16's `chunks` (reuse ticket 16's
   chunker for Markdown bodies; a plain message is one chunk). Call ticket 16's
   `indexDocument`/`rebuildIndex`/`syncDocument` — **no hand-written index/FTS5
   SQL here.** Wire two triggers: (a) at serve boot, after ticket 16's
   `ingestFromConfig`, run a full projection so search covers accumulated
   threads; (b) on each `recordMessage` into a **public** conversation, run the
   incremental `syncDocument` for that conversation. **Private conversations are
   never projected** — the gate is enforced here and asserted by spec. Because
   the projection lives in the derived index, a `rebuildIndex` re-derives it from
   the durable store (the durable store is the source), composing the two
   recovery models.

8. **Guest submission surface**
   (`packages/plggpress/src/Collab/usecase/guestThreadsApi.ts`). A `plgg-server`
   `Web` sub-app, guarded by ticket 19's `requireRole(r => r === "guest" || r
   === "admin")` + `requireCsrf`: `POST /threads` opens a conversation on a
   content path (`parseForm` → cast → `openConversation`), `POST
   /threads/:id/messages` appends (`recordMessage`). Author is the session
   `Subject` (never client-supplied). Render a minimal server-side form (or,
   if ticket 20's scheduler is available, declare it — but the hard dependency is
   auth/content, so a plain form is acceptable) with the CSRF token; responses
   `jsonResponse` or a redirect. Anonymous submission is **not** offered
   (record the decision — invited guests only).

9. **Admin management surface**
   (`packages/plggpress/src/Collab/usecase/adminThreadsApi.ts`). A `Web` sub-app
   guarded by `requireRole(r => r === "admin")` + `requireCsrf`: `GET /threads`
   lists conversations (filter by `status` open/addressed/closed and by linked
   article via `getQuery`), `GET /threads/:id` returns a thread with messages,
   `POST /threads/:id/status` transitions the lifecycle (`transitionStatus`,
   destructive-ish → the admin UI later wraps confirmation; the route rejects an
   illegal transition), `POST /threads/:id/reply` appends an admin message
   (`recordMessage` with `authorKind: "admin"`). All list/detail responses
   `jsonResponse`; every mutation CSRF-checked; every error folds to a typed JSON
   error (no throw escapes).

10. **Mount at the seam** (`packages/plggpress/src/server/pressServer.ts`). Inside
    `pressServeWeb`, mount `route("/collab", guestThreadsApi(...))` and
    `route("/admin/threads", adminThreadsApi(...))` (or under ticket 19's
    `/admin` guard) — **and only here** (ticket 14's seam). Open the durable
    store once at serve startup (`openStakeholderStore`, path from serve config)
    and run the boot projection (§7). `pressRouter`/`buildSpecOf`/the SSG
    (`build`) render path stays **byte-untouched** (dual-mode / D5).

11. **Runnable demo** (`packages/plgg-content/example.ts` additions, or the new
    package's `example.ts`): open an in-memory durable store, open a public and a
    private conversation, `recordMessage` a few turns (one via the `source:
    "voice"` contract path to prove ticket 25's seam), `listConversations` by
    status, `transitionStatus` open→addressed→closed, then project into an
    in-memory ticket-16 index and show the **public** thread is found by
    `searchIndex` while the **private** one is not — the proof-of-value + the
    visibility-gate demonstration, printed in one `proc` chain. Quote its output
    in the PR.

12. **Specs** (colocated, flat `test()`, absolute imports, real `node:sqlite`):
    the closed-union casters (Err on garbage); the **reversible migrations**
    (up → down → up round-trip proves real rollback); the store driver over both
    the in-memory testkit and `sqliteDb` (transactional two-row writes);
    `transitionStatus` (every legal transition + rejection of each illegal one via
    the exhaustive matcher); `recordMessage` (single-writer ordering; the
    `source:"voice"` contract path yields the same stored shape as `"web"`);
    `listConversations` (status/article filter, paging math, `totalCount`,
    hard-capped `limit`); **the visibility gate** (a private conversation is never
    projected and is absent from `searchIndex`; a public one is present); and in
    plggpress: the **authorization matrix** (anonymous → 401/redirect, guest on
    an admin route → 403, admin → 200) and the **CSRF** accept/reject on every
    state-changing route, driven through `handle(pressServeWeb(...), req)`; plus
    an assertion that `plggpress build` static output is unchanged.

13. **House rules throughout:** no `as`/`any`/`ts-ignore`; `Option`/`Result` +
    exhaustive `match` (`plgg-coding-style`); prefer `Str`/`asStr` over `SoftStr`
    in new code where seams allow; Prettier `printWidth: 50`; **zero new
    third-party dependencies** (every dep a workspace `file:` package or Node
    stdlib; no native bindings — `node:sqlite` behind plgg-sql's `Db` seam is the
    only SQLite surface); no hand-assembled FTS5/index SQL (project through ticket
    16). Verify the runner scripts need no edit (in-`plgg-content` default) or
    apply the exact contingency wiring (new-package path).

## Quality Gate

**Acceptance criteria**

1. **DB-primary & durable (D4), not derived:** the stakeholder store lives in its
   own durable `Db` (separate SQLite file, path-parameterized), evolves through
   **reversible** `plgg-db-migration` up/down migrations (a spec proves an
   up→down→up round trip), and is **never** touched by ticket 16's
   `rebuildIndex` (a spec runs `rebuildIndex` and asserts the `conversations`/
   `messages` rows survive intact). The design note records the backup posture
   and delegates the at-rest snapshot/restore drill to ticket 28.
2. **Entity model & lifecycle are closed and total:** `ConversationKind`/
   `ConversationStatus`/`MessageSource`/`AuthorKind`/`Visibility` are closed
   unions consumed with exhaustive `match`; the status transition function accepts
   only legal transitions and returns a typed `Err` on illegal ones (an added
   status would be a compile error). Article linkage is by durable `contentPath`,
   not by a derived `documents.id` FK.
3. **Ingestion contract is written and single-writer:** `model/Ingestion.ts`
   documents how a transcript turn maps to an `IngestMessage`; `recordMessage` is
   the sole writer for both `source: "web"` and `source: "voice"`, and a spec
   drives the voice path to prove ticket 25 lands in the same store with no new
   code path.
4. **Feed-into-RAG, visibility-gated (recorded default YES):** public
   conversations are projected into ticket 16's index (via ticket 16's ingest —
   **no hand-written FTS5/index SQL**, `grep` finds none) and are findable via
   `searchIndex`; **private** conversations are never projected and a spec asserts
   a private thread is unreachable through `/api/search`. A `rebuildIndex`
   re-derives the projection from the durable store.
5. **Guest submission is invited-only, CSRF-safe:** the guest surface requires a
   guest/admin session and a valid CSRF token; anonymous submission is not
   offered; the author is the session `Subject`, never client-supplied; the body
   is stored verbatim as data.
6. **Admin management + authorization boundary (Phase 6/7 discipline):** admin
   list/detail/transition/reply require `roleOf(subject) === "admin"` via ticket
   19's `requireRole` (no fail-open branch); the authorization matrix
   (anonymous/guest/admin × every route) and CSRF accept/reject are spec-asserted
   through the real mounted stack.
7. **Boundary & topology intact:** the durable domain imports neither plggpress
   nor `plgg-http`/`plgg-server` (it stays HTTP-free like `plgg-content`); the
   mounts live **only** at `pressServeWeb`'s seam; `plggpress build` static output
   is byte-identical before/after (empty `diff -r`); `pressRouter`/`buildSpecOf`
   are unmodified.
8. **No escape hatches, zero new deps, coverage & wiring:** `grep` finds no
   `as `/`any`/`ts-ignore` in new modules; no new third-party dependency in any
   `package.json`; the export map stays `types`+`default` (concern 51); the
   in-`plgg-content` default adds no runner-script line (or the new-package
   contingency wires `build.sh`/`npm-install.sh`/`check-all.sh` with the exact
   `cd`-line format); new code clears its ≥90 four-metric gate and plggpress stays
   green on all four.

**Verification method**

Run `scripts/tsc-plgg.sh` (clean), `./scripts/test-plgg-content.sh` (or
`./scripts/test-plgg-collab.sh` on the contingency), and
`./scripts/test-plggpress.sh` and paste the gate lines (the migration
round-trip, the transition matrix, the visibility-gate spec, the authorization
matrix, and the CSRF specs). Run `npx tsx packages/plgg-content/example.ts` and
show the lifecycle transitions plus the public-found / private-absent search
result. Serve smoke: from `packages/guide`, `npx plggpress serve --port <p>`,
then (with a guest and an admin session from ticket 19) `curl` a `POST
/collab/threads` as a guest, `GET /admin/threads?status=open` as an admin, a
`POST .../status` transition, and a `GET /api/search?q=<term>` showing the public
thread surfaces while a private one does not — paste the JSON and status codes.
Byte-identity: `npx plggpress build` into two dirs before/after and paste the
empty `diff -r`. Then a **fresh** `scripts/check-all.sh` (clean rebuild — stale
dists must not mask the new edge or a build-order change) must be green end to
end.

**Gate**

All eight acceptance criteria hold objectively AND the fresh `check-all.sh` is
green AND coverage stays >90 on every touched package. Storing stakeholder data
in ticket 16's disposable index file, a `rebuildIndex` that wipes stakeholder
rows, a non-reversible (drop-and-recreate) migration, an ungated feed that leaks
a private conversation into anonymous search, a fail-open guard, a
CSRF-unprotected state-changing POST, an anonymous submission path, an article
linkage by derived `documents.id`, any hand-assembled FTS5/index SQL, an SSG
byte diff, an `as`/`any`/`ts-ignore`, a new third-party dependency, or a coverage
dip fails the ticket.

## Considerations

- **Durable vs derived is the whole ticket.** The one mistake to avoid is
  co-locating this primary data with ticket 16's rebuildable index. Ticket 16's
  recovery contract deliberately makes its DB disposable; this store must be the
  opposite. Separate `Db` file, reversible migrations, and the
  rebuild-never-wipes invariant are not optional polish — they are the reason the
  recovery policy is being changed. If a reviewer proposes "just add the tables
  to the content index," that is the failure mode.
- **Visibility default is private; public is a choice.** Defaulting conversations
  to `private` fails safe: a new stakeholder request is not searchable by the
  anonymous world until someone (or a rule) marks the thread public. The
  feed-into-RAG "YES" default means *public* threads are indexed like content;
  it does not mean every request is exposed. Revisit trigger: if per-message
  visibility or redaction is ever needed, that is a model change (message-level
  `Visibility`), not a query hack.
- **Anonymous submission is deferred, not forgotten.** The vision scopes this to
  *invited* collaborative guests, so auth-gated submission is correct now. If a
  public "leave feedback" box is later wanted, it needs abuse controls
  (rate-limiting, captcha-equivalent, moderation) that belong with operations
  (ticket 28) — do not open an anonymous write path here.
- **Projection timing / hot reload.** The projection runs at serve boot and on
  each public `recordMessage`; there is no file watcher (concern
  `51-hot-reload-does-not-refresh-config.md` — watch/hot-reload is a
  toolchain/operations concern for ticket 28). If boot projection of a large
  backlog is slow, a persisted projection + incremental catch-up is the
  optimization; the durable store and the contract do not change.
- **Ticket 25 conformance is a contract, not code here.** The voice agent will
  call `recordMessage` with `source: "voice"`; this ticket owns the seam and the
  written invariants, ticket 25 owns the Realtime/ephemeral-key machinery
  (D12). Keep `recordMessage` transport- and vendor-agnostic so ticket 25 injects
  nothing new into this package.
- **Admin UI on the scheduler is ticket 20's shape.** This ticket's admin surface
  is functionally complete as routes; when ticket 20's scheduler/admin shell
  exists, the list/detail/transition views should be re-expressed as scheduler
  Resources/Actions rather than kept as bespoke handlers. Because the hard
  dependency here is auth + content (not the scheduler), a plain server-rendered
  admin surface is acceptable for this ticket — record the follow-up to fold it
  into ticket 20's declaration.
- **Embeddings are ticket 24's.** The projection feeds D11's always-on FTS5
  tier; the opt-in `Float32` embedding BLOB over the same projected chunks is
  ticket 24. Keep the projected `chunks` shape stable so 24 attaches embeddings
  without re-projecting.
- **D4 revisit trigger.** When ticket 22 ships guest article *editing*, D4's
  "revisit SQLite-primary" trigger fires; at that point re-examine whether content
  and this durable stakeholder store should share a primary database and backup
  drill. Until then, content stays git-primary and only this store is
  DB-primary.
</content>
</invoke>

## Final Report

Development completed (Phase-7 collaboration). plggpress now ACCUMULATES
stakeholder interactions in a DB-PRIMARY, durable conversation store — the
deliberate inverse of ticket 16's rebuildable index (D4). Implemented across eight
committed, tested slices (each behind a fresh green check-all):

- **pt.1 `3ed8028`** — 5 closed unions (ConversationKind/Status/Visibility/
  AuthorKind/MessageSource) + transitionStatus lifecycle state machine + feedsRag.
- **pt.2 `33e9ed8`** — Conversation/Message entities (contentPath links by durable
  PATH not a derived FK; SoftStr for DB round-trip) + the WRITTEN INGESTION
  CONTRACT (the stable seam ticket 25's voice agent lands into).
- **pt.3 `efec9df`** — reversible in-code migrations + openStakeholderStore (own
  node:sqlite file, FK cascade, idempotent, never touched by rebuildIndex).
- **pt.4 `f04c1fa`** — StakeholderStore seam + sqlStakeholderStore driver (every
  value bound, every row caster-decoded, save* return the assigned id).
- **pt.5 `6989022`** — ingest (transactional new-conversation+first-message,
  orphan-safe) + changeStatus (transitionStatus-guarded) + the barrel.
- **pt.6 `27216b8`** — the guest web submission surface (RP-session + CSRF POST →
  ingest).
- **pt.8 `cd848fc`** — the visibility-gated RAG feed (only public conversations
  project into the content index; private stay durable-only; never writes back).
- **pt.7 `1bbde44`** — admin conversation views (a conversations Collection + a
  conversationMessages child on the admin declaration) + status Actions
  (changeStatus via the SSR set-status verb) + the SERVE MOUNT (a durable
  stakeholder store opened at the seam, deliverAdmin threaded, submitWeb mounted
  live at /requests).

### Discovered Insights

- **Insight**: this store INVERTS every recoverability assumption of ticket 16's
  index — it is primary, author-created, irreplaceable, with no git source. So:
  REVERSIBLE migrations (not execScript/drop-recreate), its OWN durable file that
  rebuildIndex never touches, and the RAG feed reads it but only ever writes the
  DERIVED index. **Context**: D4 made concrete.
- **Insight**: a nullable SQL TEXT column (JS null) decodes via `forProp("col",
  asOptionalText)` (null→None), NOT `forOptionProp` — SQLite always INCLUDES the
  column (present-but-null), so nullability lives in the caster, and `asStr`
  rejects empty/plain strings while `asSoftStr` accepts them. Entities use SoftStr
  for round-trip. [[reference_plggmatic_consumer]]
- **Insight**: in-code migrations (migration()+asMigrationDir()+migrator(db,
  sqlite, dir)+migrateUp) SHIP in the dist, so a same-process consumer opens the
  store without an unpackaged migrations dir — the ticket-19 OP-schema lesson.
  `box("Version")("14-digits")` builds the known-valid version without asVersion's
  dead branch.
- **Insight**: the RAG feed is visibility-gated at the PROJECTION, not the store —
  every message is durable regardless; flipping visibility changes only what the
  derived index sees, never a durable row.

### Remaining (follow-up, not this ticket)

- Ticket 25's voice agent lands into the ingest contract unchanged (agent
  authorKind + voice source are already in the model).
- A production deploy threads real file paths (not :memory:) + the served origin
  for the issuer; at-rest backup/restore drill is ticket 28.
- Ticket 16's live /api mount can reuse the content index the serve seam opens.
