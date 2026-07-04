---
created_at: 2026-07-04T14:30:15+09:00
author: a@qmu.jp
type: enhancement
layer: [DB, Domain]
effort: 4h
commit_hash: 7612bbd
category: Added
depends_on: []
---

# plgg-sql FTS5 support: typed virtual-table DDL, `MATCH`/`bm25()` search fragments, external-content sync

## Overview

Phase 5 (Server & data), ticket **15** of the plggpress/plggmatic roadmap —
implements the library half of **D11** ("Zero-dependency purism: always-on
baseline = SQLite FTS5 (BM25) … No sqlite-vec/native extensions. Graceful
degradation without an API key") from the approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`. **D4** shapes the
design: SQLite is a *derived, rebuildable* index over Git/filesystem content,
so rebuild/re-sync of the FTS index is a first-class operation, not an
afterthought. The consumer is roadmap ticket **16**
(plggpress-content-index-and-delivery-api), which owns the phase-5 gate
"FTS5 search returns sane results on the real guide corpus"; this ticket
delivers the vocabulary it will speak.

Today `plgg-sql` can *almost* express FTS5, but only through escape hatches:

- The `sql` tagged template (`packages/plgg-sql/src/Sql/model/Sql.ts`) binds
  every interpolation as a `?` parameter or splices a **branded** `Sql`
  fragment. Identifiers (table/column names) are neither — SQLite cannot bind
  an identifier as a parameter — so any code that composes DDL or a
  `<table> MATCH ?` clause from data must today concatenate raw strings,
  exactly the pattern the private `SQL_BRAND` was introduced to forbid
  (ticket `20260610122933`).
- `CREATE VIRTUAL TABLE … USING fts5(…)` with its option grammar
  (`UNINDEXED`, `content=`, `content_rowid=`, `tokenize=`) has no typed
  representation at all; a mistyped option is a runtime `SqlError` instead of
  a compile-time error — against the house type-driven discipline.
- A raw user search string bound into `MATCH ?` is injection-safe (it is a
  parameter) but not *crash*-safe: FTS5 parses the right-hand side with its
  own query grammar, so a stray `"` or `(` from a visitor's search box throws
  an fts5 syntax error at runtime. The always-on search baseline needs a
  sanitizer that turns arbitrary user text into a valid FTS5 phrase query.

**Probe result (pre-verified 2026-07-04, to be re-run and recorded as
implementation step 1):** on this host (Node v24.13.1, `node:sqlite`,
SQLite 3.51.2, in-memory `DatabaseSync`):
`PRAGMA compile_options` reports `ENABLE_FTS5` (plus FTS3/FTS3_PARENTHESIS);
`CREATE VIRTUAL TABLE … USING fts5` works for the plain, contentless
(`content=''`), and external-content (`content='src', content_rowid='id'`)
forms; `WHERE t MATCH ?` with a bound parameter and `bm25(t)` ranking return
ordered rows; `INSERT INTO t(t) VALUES('rebuild')` succeeds. The only output
noise is node:sqlite's `ExperimentalWarning`, already tolerated by the
plgg-db-migration and plgg-auth suites. D11's premise holds; no fallback
engine is needed.

Design (zero new deps, no native bindings, driver seam untouched):

1. **Branded identifiers.** New `SqlIdent` refined/branded type +
   `asSqlIdent` caster (SQLite identifier grammar, e.g.
   `[A-Za-z_][A-Za-z0-9_]*`) in `Sql/model/`, and a guarded fragment
   constructor in `Sql/model/Sql.ts` (`identSql: (i: SqlIdent) => Sql`,
   a param-free branded fragment) so a *validated* identifier — and nothing
   else — can be spliced. `SQL_BRAND` stays module-private; the
   placeholder-count invariant is untouched.
2. **Typed FTS5 table spec.** New `Fts5` domain
   (`src/Fts5/model/`, `src/Fts5/usecase/`, mirroring the existing
   `Db`/`Sql`/`Mapping` layout): `Fts5Table` = name, non-empty columns (each
   with an `UNINDEXED` flag), a content **sum type**
   (`Normal | Contentless | ExternalContent{table, rowid}`) folded with
   exhaustive `match`, and an `Option` tokenizer drawn from a *closed* union
   of built-ins (`unicode61 | porter | trigram | ascii`) — no free-form
   string, no escape hatch.
3. **Builders as fragments, not an AST.** `createFts5Table: Fts5Table => Sql`
   (DDL, zero params); `fts5Match(table)(query)` → `<table> MATCH ?`
   fragment; `bm25Rank(table, weights?)` → `bm25(<table>, ?, …)` fragment
   (weights bound as params); `fts5Rebuild(table)` →
   `INSERT INTO t(t) VALUES('rebuild')` (the D4 "derived, rebuildable"
   lever); `fts5SyncTriggers(spec)` → the three external-content
   `AFTER INSERT/DELETE/UPDATE` triggers (each a single statement, with the
   FTS5 `'delete'` command inserts). Everything composes with the existing
   `sql` template, `query`/`exec`/`transaction` steps, and `decodeRows` —
   plgg-sql stays a set of pipeline steps, not a query-builder AST (its
   founding story is explicit on this).
4. **User-input sanitizer.** `fts5Phrase` (name per taste) turns arbitrary
   user text into a safe FTS5 query string: split on whitespace, wrap each
   token in double quotes, double any embedded `"`. Developer-authored
   advanced query strings may still be bound directly — they are parameters,
   and a syntax slip surfaces as a `SqlError` on the `Result` channel, never
   a throw.
5. **Migrations.** plgg-db-migration passes each `-- migrate:up/down` section
   verbatim to `execScript` (`parseMigration.ts` splits only on marker
   lines), so FTS5 DDL and trigger bodies with embedded semicolons should
   flow through unaltered. Verify with a real FTS5 migration fixture through
   the testkit migrator; extend the engine **only if** the probe of that path
   finds a gap (none expected).

`plgg-sql` is an existing, fully wired package (`scripts/build.sh:50`,
`scripts/npm-install.sh:23`, `scripts/check-all.sh:42`) — no new package, no
runner-script edits, no manifest changes.

## Policies

- `workaholic:design` / `policies/security.md` — the threat-model discipline
  behind plgg-sql's injection-safe-by-construction builder. The policy
  (frozen 2026-02) still says SQL sanitization is "not applicable … no
  database layer"; the DB layer now exists, and this ticket extends its
  safety property to identifiers: only brand-validated `SqlIdent` values may
  reach SQL text, and hostile search input must be crash-safe, not just
  injection-safe.
- `workaholic:implementation` / `policies/quality.md` — type safety as the
  sole static-analysis gate: the FTS5 option grammar becomes a typed spec
  with exhaustive `match` so misuse is a compile error; strictly no
  `as`/`any`/`ts-ignore`; Prettier `printWidth: 50` per package.
- `workaholic:implementation` / `policies/test.md` — the 90%
  four-metric coverage doctrine and the "test against the real engine"
  practice: FTS5 specs must run against real `node:sqlite`, mirroring the
  plgg-db-migration/plgg-auth testkit seams. plgg-sql is gated at **91**
  (`packages/plgg-sql/plgg-test.config.json`) — the new module must clear it.

## Key Files

- `packages/plgg-sql/src/Sql/model/Sql.ts` — the branded `Sql` box, private
  `SQL_BRAND`, `makeSql`, splice-vs-bind logic; gains the guarded `identSql`
  fragment constructor. The placeholder-invariant comments there are the
  contract to preserve.
- `packages/plgg-sql/src/Sql/model/index.ts`, `src/Sql/index.ts`,
  `src/index.ts` — barrels to extend (`SqlIdent`, `Fts5` exports).
- `packages/plgg-sql/src/Fts5/` — **new** domain: `model/Fts5Table.ts` (+
  spec), `usecase/createFts5Table.ts`, `usecase/searchFts5.ts` (match/bm25/
  phrase helpers), `usecase/syncFts5.ts` (triggers + rebuild), with specs and
  `index.ts` barrels per the existing `Db`/`Mapping` layout.
- `packages/plgg-sql/src/Db/model/Db.ts` — the driver seam (`all`/`run`/
  `execScript`); unchanged, but the reason FTS5 output must stay plain `Sql`
  values / trusted scripts.
- `packages/plgg-sql/example.ts` — the `node:sqlite` `open` seam to mirror
  for a spec-local real-driver harness (and the natural place to append a
  short FTS5 search demo, per the runnable-demo working style).
- `packages/plgg-sql/plgg-test.config.json` — threshold 91; new code is
  gated by it.
- `packages/plgg-db-migration/src/domain/usecase/parseMigration.ts` — the
  dbmate-style marker splitter that must (and should already) pass FTS5
  bodies through verbatim.
- `packages/plgg-db-migration/src/testkit/migrator.ts`,
  `src/testkit/sqliteDb.ts` — the harness for the FTS5 migration fixture
  spec.

## Related History

- `.workaholic/tickets/archive/plgg-sql/20260527142355-create-plgg-sql-builder.md`
  and `.workaholic/stories/plgg-sql.md` — plgg-sql's founding POC:
  "deliberately *not* an ORM and *not* a query-builder AST". FTS5 support
  must respect that identity — fragments and steps, not a DDL builder
  language.
- `.workaholic/tickets/archive/work-20260531-003055/20260610122933-plgg-sql-symbol-brand-placeholder-invariant.md`
  — introduced the private `SQL_BRAND` so forged boxes cannot be spliced.
  `identSql` is the first new door through that wall; it must open only for
  brand-validated `SqlIdent` values.
- `.workaholic/tickets/archive/work-20260627-205005/20260627210145-plgg-sql-execscript-seam.md`
  and `…/20260627210146-scaffold-plgg-db-migration-package.md` (story
  `.workaholic/stories/work-20260627-205005.md`) — added the trusted-script
  path (`execScript`/`runScript`) and the migration engine this ticket
  verifies against FTS5 bodies.
- `.workaholic/tickets/archive/work-20260624-135934/20260624141700-u2-migrate-plgg-sql.md`
  — the plgg-test migration that set plgg-sql's 91 threshold.
- Sibling roadmap tickets: **02**
  (`20260704143002-harden-coverage-gate-defaults.md`) makes the coverage
  gate load-bearing in check-all — this ticket's specs should assume
  enforcement; **14** (plggpress-serve-mode-dual-config) and **16**
  (content-index-and-delivery-api, not yet written) are the phase-5
  consumers; **24** (rag-embeddings-and-search) later adds the opt-in
  embeddings tier on top of this baseline. No file overlap with 01–14.

## Implementation Steps

1. **Probe and record.** Re-run the FTS5 probe against `node:sqlite`
   (`PRAGMA compile_options` must list `ENABLE_FTS5`; create plain,
   contentless, and external-content fts5 tables; `MATCH ?` + `bm25()`;
   `'rebuild'`). Paste the output into the PR as the D11 evidence. If — on
   the deploy host — FTS5 were ever absent, **stop and amend the roadmap
   spec** before writing code (not expected: pre-verified above on this
   host, Node v24.13.1 / SQLite 3.51.2).
2. **`SqlIdent`.** Add `packages/plgg-sql/src/Sql/model/SqlIdent.ts`: a
   branded string refined to the safe identifier grammar, with `asSqlIdent`
   returning `Result` (Err on empty, keywords-with-quoting-needs, or any
   character outside the grammar). Spec: accepts `docs`, `content_rowid`;
   rejects `"x"`, `a b`, `a;--`, `""`.
3. **`identSql` fragment constructor** in `Sql/model/Sql.ts`: takes a
   `SqlIdent`, returns a param-free branded `Sql` via the private `makeSql`.
   `SQL_BRAND` and `makeSql` stay unexported. Spec: an `identSql` fragment
   splices into `sql\`…\`` text without adding a placeholder; the
   text/params invariant holds under mixed splices and binds.
4. **`Fts5Table` model** (`src/Fts5/model/Fts5Table.ts`): columns
   (non-empty, `SqlIdent` names, `Bool` unindexed), content sum
   (`Normal | Contentless | ExternalContent{table: SqlIdent, rowid: SqlIdent}`),
   `Option` tokenizer from the closed built-in union. Constructors/casters in
   plgg house style; exhaustive `match` over the content sum everywhere it is
   folded.
5. **DDL builder** (`src/Fts5/usecase/createFts5Table.ts`): render
   `CREATE VIRTUAL TABLE <name> USING fts5(col [UNINDEXED]…, content=…,
   content_rowid=…, tokenize=…)` as an `Sql` with zero params, matching each
   content variant (contentless renders `content=''`). Spec asserts exact
   rendered text per variant and executes each against real `node:sqlite`.
6. **Search fragments** (`src/Fts5/usecase/searchFts5.ts`):
   `fts5Match(table)(queryString)` → `<table> MATCH ?` (query bound);
   `bm25Rank(table, Option<weights>)` → `bm25(<table>[, ?…])` (weights
   bound); `fts5Phrase(userInput)` → quoted-phrase query string (tokens
   double-quoted, embedded `"` doubled, empty input → a query that matches
   nothing rather than a syntax error). Specs: end-to-end
   insert→match→`ORDER BY` bm25 through `query`+`decodeRows` on real
   `node:sqlite`; hostile inputs (`"`, `(`, `AND`, `*`, mixed quotes) never
   throw — either sanitized by `fts5Phrase` or surfaced as `SqlError` on the
   `Result` channel.
7. **Sync + rebuild** (`src/Fts5/usecase/syncFts5.ts`):
   `fts5Rebuild(table)` and, for the `ExternalContent` variant,
   `fts5SyncTriggers(spec)` returning the three `CREATE TRIGGER` statements
   (each a single `Sql`; the delete/update paths insert the FTS5 `'delete'`
   command rows). Spec: create content table + index + triggers, mutate the
   content table, assert MATCH reflects inserts/updates/deletes; assert
   `'rebuild'` restores a dropped-and-repopulated index.
8. **Barrels.** Wire `Fts5` and `SqlIdent` through `src/Fts5/index.ts`,
   `src/Sql/model/index.ts`, and `src/index.ts` in the existing
   `export * from "plgg-sql/…"` style.
9. **Migration-path verification.** In plgg-db-migration, add a spec with a
   real migration fixture whose `up` creates an external-content FTS5 table
   plus triggers (semicolons inside `BEGIN…END`) and whose `down` drops
   them; run it up and down through the testkit migrator + `openSqliteDb`.
   Expected: passes with zero engine changes (sections run verbatim via
   `execScript`). Only if it fails, fix the engine minimally in the same
   ticket and say so in the PR.
10. **Demo.** Extend `packages/plgg-sql/example.ts` with a short FTS5
    section (create index, ingest a few docs, ranked search in one `proc`
    chain) — the runnable proof-of-value.
11. House rules throughout: no `as`/`any`/`ts-ignore`; `Option`/`Result` +
    exhaustive `match` (plgg-coding-style); prefer `Str`/`asStr` over
    `SoftStr` in new code where the seam types allow; Prettier
    `printWidth: 50`; **zero new dependencies** in every touched
    `package.json`; no script edits (`npm-install.sh`/`build.sh`/
    `check-all.sh` already carry plgg-sql and plgg-db-migration).

## Quality Gate

**Acceptance criteria**

1. **Probe recorded:** the PR contains the step-1 probe output showing
   `ENABLE_FTS5` and the working MATCH/bm25/contentless/external-content/
   rebuild round trips on `node:sqlite`.
2. **No escape hatches:** all three content modes of
   `CREATE VIRTUAL TABLE … USING fts5` are expressible through the typed
   API; `grep` over the new modules finds no `as `/`any`/`ts-ignore`, and no
   identifier reaches SQL text except through `asSqlIdent`→`identSql`
   (`SQL_BRAND`/`makeSql` remain unexported).
3. **Search works end-to-end:** a spec ingests documents and gets
   bm25-ordered, `decodeRows`-typed results back from a
   `sql`+`fts5Match`+`bm25Rank` pipeline on real `node:sqlite`.
4. **Crash-safe input:** for a table of hostile search strings, every query
   either succeeds (via `fts5Phrase`) or yields an `Err<SqlError>` — no
   spec observes a throw.
5. **External-content stays in sync** through the generated triggers under
   insert/update/delete, and `fts5Rebuild` restores the index.
6. **Migration fixture green:** the FTS5 up/down migration applies through
   the plgg-db-migration testkit unchanged (or the PR names the exact engine
   gap fixed).
7. **Invariant preserved:** existing `Sql.spec.ts` behaviors still hold;
   forged-box splicing is still rejected.
8. Zero new dependencies; no edits under `scripts/`; plgg-sql coverage
   clears its 91 threshold and plgg-db-migration clears its gate, all four
   metrics.

**Verification method**

Run `scripts/tsc-plgg-sql.sh`, `scripts/test-plgg-sql.sh`, and
`scripts/test-plgg-db-migration.sh` and paste the gate lines; run
`npx tsx packages/plgg-sql/example.ts` and show the ranked FTS5 demo output;
then a **fresh** `scripts/check-all.sh` (clean rebuild — stale dists must not
mask drift) must be green end-to-end.

**Gate**

All eight acceptance criteria hold objectively AND the fresh `check-all.sh`
run is green. Any raw-string identifier path, any `as`/`any`/`ts-ignore`, any
new dependency, or any silently lowered threshold fails the ticket.

## Considerations

- **First dialect-specific corner of plgg-sql.** The `Db` seam is
  driver-agnostic, but `Fts5` is SQLite-dialect by definition. Keep it in its
  own domain directory so the dialect boundary is visible; do not let
  FTS5-isms leak into `Sql`/`Db`/`Mapping`. If a second dialect ever
  matters, the domain name already scopes it.
- **Japanese text.** `unicode61` tokenizes CJK poorly; the closed tokenizer
  union includes `trigram` (substring-style matching) as the practical
  Japanese option for the guide/qmu corpus. Custom tokenizers require the
  SQLite C API, which `node:sqlite` does not expose — a known D11-adjacent
  limit; revisit only if ticket 16's corpus-quality check demands it (record
  there, not here).
- **Contentless limitations:** plain contentless tables are insert-only
  (no UPDATE; DELETE needs newer `contentless_delete=1` semantics). Given
  D4 (index is derived and rebuildable), the supported story for contentless
  is drop/rebuild or the `'rebuild'` command — document this on the variant;
  do not chase `contentless_delete` until a consumer needs it.
- **`ExperimentalWarning` from node:sqlite** appears in spec output; already
  the accepted status quo in plgg-db-migration/plgg-auth (Node ≥22.6 is the
  accepted driver surface per the roadmap constraints). No suppression
  hackery.
- **Deliberately deferred:** embeddings/cosine top-k (roadmap ticket 24);
  the content-indexing pipeline, snippet()/highlight() presentation helpers,
  and corpus-quality evaluation (ticket 16 — add snippet/highlight fragments
  there if the delivery API needs them, they are mechanical siblings of
  `bm25Rank`); per-column weighted ranking beyond bm25 weights; ANN index at
  scale (D11 revisit trigger).
- **Revisit trigger:** if ticket 16 finds itself string-assembling any FTS5
  SQL, the vocabulary here is incomplete — extend this module rather than
  letting raw SQL creep into plggpress.

## Final Report

Landed in feat `7612bbd` (19 files, +…), archived in this housekeeping commit.
The library half of D11: a typed, escape-hatch-free FTS5 vocabulary for plgg-sql.

### Probe (step 1, D11 evidence)
`node:sqlite` on this host (Node v24.13.1, SQLite 3.51.2): `PRAGMA
compile_options` reports `ENABLE_FTS5`; plain / `content=''` / external-content
`CREATE VIRTUAL TABLE … USING fts5` all work; `MATCH ?` + `bm25()` return ordered
rows; `INSERT INTO t(t) VALUES('rebuild')` succeeds. No fallback engine needed.

### What shipped
- **`SqlIdent` + `identSql`** (`Sql/model/SqlIdent.ts`, `Sql/model/Sql.ts`) — a
  branded identifier (`[A-Za-z_][A-Za-z0-9_]*`) and the ONLY sanctioned way an
  identifier reaches SQL text (SQLite cannot bind one as `?`). `identSql` returns
  a param-free `Sql` fragment via the still-private `makeSql`; `SQL_BRAND` and
  `makeSql` stay unexported.
- **`Fts5Table` model** — closed spec: columns (SqlIdent + UNINDEXED flag), a
  `Normal | Contentless | ExternalContent{table,rowid}` content sum folded with
  exhaustive `match` (via `defineVariant`), and an `Option` tokenizer from the
  closed `unicode61|porter|trigram|ascii` union. `fts5Table` validates the one
  invariant types can't (≥1 column).
- **Builders as fragments** — `createFts5Table` (zero-param DDL, a `Record`
  makes the tokenizer clause exhaustive), `fts5Match`/`bm25Rank`/`fts5Phrase`
  (search; user text bound, never concatenated), `fts5Rebuild`/`fts5SyncTriggers`
  (the D4 derived-rebuildable levers; the three AI/AD/AU external-content
  triggers, or an `Err` for Normal/Contentless).
- **`fts5Phrase`** — turns arbitrary user text into a crash-safe quoted-phrase
  query (metacharacters become literal phrase text; empty → `""` matching
  nothing). Verified against the real engine.
- Wired through `Fts5`/`Sql/model`/root barrels; plgg-sql deps unchanged; no
  runner-script edits. `example.ts` gains a ranked-search demo.

### Design decisions (recorded)
- **First dialect-specific corner** of plgg-sql, isolated in its own `Fts5`
  domain so `Db`/`Sql`/`Mapping` stay driver-agnostic.
- **Identifier safety generalizes the SQL_BRAND wall** to identifiers: only a
  brand-validated `SqlIdent` becomes a fragment; the tokenizer/content literals
  are compile-time-closed trusted values placed in static templates (no minting,
  no dead branches).
- **The migration seam is verbatim**: plgg-db-migration passes FTS5 DDL + trigger
  bodies (embedded `;` inside `BEGIN…END`) through `execScript` with ZERO engine
  changes — proven by a real up/down fixture through the testkit migrator.

### Verification (all 8 ACs)
- Fresh `scripts/check-all.sh` **EXIT 0** — 0 failed; plgg-sql 100% statements
  (all four metrics >91); plgg-db-migration >91.
- No `as`/`any`/`ts-ignore` anywhere in the new files; `SQL_BRAND`/`makeSql`
  unexported; every content mode expressible through the typed API.
- End-to-end on real `node:sqlite`: external-content triggers sync insert/
  update/delete; a `sql`+`fts5Match`+`bm25Rank` pipeline returns bm25-ordered,
  `decodeRows`-typed hits; 7 hostile inputs never throw (Ok via `fts5Phrase`); a
  raw unsanitized query surfaces as `Err<SqlError>`; `fts5Rebuild` restores.
- FTS5 up/down migration applies and rolls back through the testkit migrator
  unchanged. `npx tsx example.ts` prints a ranked search + a sanitized hostile
  query returning `Ok — []`.

### Follow-ups
- snippet()/highlight() presentation helpers + corpus-quality eval are ticket 16
  (mechanical siblings of `bm25Rank`); embeddings/cosine top-k is ticket 24.
- `contentless_delete` and per-column weighted ranking beyond bm25 weights are
  deferred until a consumer needs them.
