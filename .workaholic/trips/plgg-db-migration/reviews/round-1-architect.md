# Round 1 Review — Architect

- **Reviewer**: Architect (structural bridge / translation fidelity)
- **Artifacts reviewed**: `directions/direction-v1.md` (Planner), `designs/design-v1.md` (Constructor)
- **Lens**: Does the structure faithfully carry the business intent into something buildable, and do the boundaries hold?

---

## Decision Summary

| Artifact | Decision |
| --- | --- |
| direction-v1 | **Approve with observations** |
| design-v1 | **Approve with minor suggestions** |

Both artifacts are coherent with model-v1 and with each other; the gaps below are
additive refinements, not redesigns. Two design items (D2, D3) are strong
enough that I ask the Constructor to fold them into design-v2 or carry them as
explicit ticket scope at decomposition.

---

## Review of direction-v1 (Planner) — Approve with observations

The phasing (certain dbmate-core first, uncertain per-tenant path verified small)
is the right business shape and maps cleanly onto a `depends_on` ticket order.
The "convergent industry model → minimize the surprise budget" rationale is
exactly the translation-fidelity argument my model makes, and the four personas
give the design real targets. I approve the business direction.

**Answer to your open question A2 (yours-to-me, structural).** *Does the current
plgg stack already reach all three dialects?* **No — and that is the correct
state, not a gap.** `plgg-sql` ships **zero** drivers; it exposes only the `Db`
seam, and the app supplies the driver (the example wires `node:sqlite`, which is
built into Node — no native binding). So "supports major databases" cannot mean
"the stack connects to PG/MySQL/SQLite for you." It means: the tool's own
bookkeeping SQL is dialect-correct, and the app brings the connection. The
Constructor's §1.2 resolves your A2 exactly this way, and it is structurally
sound. **This honors A2/A3 without constraining the dialect set** — any engine
the app can supply a `Db` for is supported.

**Concern O1 — the "supports major databases" headline can over-promise.**
A reader of §1 / Persona A may infer "write one migration, run it on any DB."
That is *not* what the tool delivers (nor what dbmate delivers): migration
*bodies* are authored per target engine; only the tool-emitted
`schema_migrations` DDL is made dialect-correct. **Proposal**: add one honest
sentence to the value proposition — "the tool runs against any major engine via
the stack's `Db` seam; migration SQL is authored for your chosen engine, as in
dbmate." This keeps the adoption promise from outrunning the build (it is
model-v1 Risk A, the dominant correctness risk your own §5 already names).

**Concern O2 — dry-run is promised but not yet structurally guaranteed.**
Your Risk table and Persona C make **dry-run / observability** a named mitigation
for destructive-operation trust. The design has `status` (observability) but no
dry-run mode. This is cheap to honor structurally — `planMigrations` already
computes the full plan *without* applying — so dry-run is "render the plan, don't
call apply." **Proposal**: carry "plan-only / `--dry-run`" as an explicit
direction requirement so it survives into decomposition rather than being lost
between the artifacts (see cross-artifact gap X1 below).

---

## Review of design-v1 (Constructor) — Approve with minor suggestions

Structurally excellent and tightly coherent with model-v1: the `Db`-seam reuse,
the declarative `Dialect` value (not a class hierarchy), branded `Version`,
`MigrationPlan` as a pure diff, `Box` `MigrationError` on the `Result` channel,
the `domain/{model,usecase}` + `entrypoints` + `vendors` layout (the current
plgg-bundle standard, correctly not the older plgg-sql one), and migrations in
`databases/<db>/migrations/`. The §2.5 per-tenant concurrency design is *more*
concrete than my model scoped, and sound for SQLite. Five concerns, each with a
proposal:

**D1 — `down` should be `Option<SoftStr>`, not "empty/None" (low, type-fidelity).**
§2.1 says a missing down "records as an empty/`None` down." An empty-but-present
down section and an absent down section are different facts; only `Option`
captures it without a null/empty-string ambiguity (house no-`null` discipline,
`type-driven-design`). **Proposal**: model `down: Option<SoftStr>` explicitly
(`None` = irreversible), as in model-v1's domain section — `applyDown` then
folds `None` → `Err(IrreversibleMigration)` with no empty-string special case.

**D2 — prefer an additive `Db.exec(text)` seam over naive `;`-splitting (medium→structural).**
This is the one boundary decision I most want revisited. Your §2.1 splits a
migration body on `;\n` and runs each statement via `plgg-sql`'s `exec`, and you
correctly flag the fragility (string literals, dollar-quoting, `BEGIN…END`) as a
medium risk with a "one statement per migration" caveat. Model-v1's Boundary 1
proposes the cleaner alternative: a **purely additive** `exec(text: SoftStr)` on
the `Db` seam for *trusted, developer-authored, multi-statement* scripts, leaving
the parameterized `run(sql: Sql)` path for the bookkeeping INSERT/DELETE/SELECT.
Why this is the better boundary:
- It pushes multi-statement execution down to the driver, which already does it
  correctly per dialect (`node:sqlite`'s `DatabaseSync.exec()` runs a whole
  script; pg's `query(multiStatement)`; mysql2 `multipleStatements`) — the
  `;`-splitting hazard **disappears** instead of being documented-around.
- It is **faithful to plgg-sql**: the existing example already reaches for
  `conn.exec("BEGIN")` because `prepare().run()` is single-statement — the seam
  is implicitly missing this capability; we are formalizing what the example
  already needs.
- It is additive (no existing call site changes) and breaking-changes-are-OK
  here (plgg is its own only consumer).

**Proposal**: add `exec(text)` to the `Db` seam in `plgg-sql` and have `applyUp`/
`applyDown` run the trusted body through it inside the `transaction` wrapper; keep
the splitter only as an optional fallback for a driver that lacks multi-statement
exec. The decision is yours (it touches plgg-sql), but structurally this trades a
standing medium-severity parser risk for one small, faithful seam addition.

**D3 — the per-migration `transaction:false` directive is missing (medium, dbmate-fidelity).**
`Migration = { version, name, up, down }` carries no per-migration transaction
override, and apply-time wrapping is driven solely by the dialect-level
`supportsTransactionalDdl`. But dbmate's DX includes `-- migrate:up
transaction:false`, and it is operationally load-bearing: PostgreSQL **supports**
transactional DDL yet `CREATE INDEX CONCURRENTLY` (and a few others) *must* run
**outside** a transaction. With only the dialect flag, a Postgres user cannot
author such a migration at all — a real fidelity and capability gap.
**Proposal**: parse the marker-line option and carry `upTransaction: Bool` /
`downTransaction: Bool` on `Migration` (model-v1 domain section); the apply-time
predicate becomes `dialect.supportsTransactionalDdl && migration.upTransaction`.
Parser-local, additive. If Postgres is a day-one target this is
request-revision-level; if Postgres is phased later it is a minor suggestion —
the Planner/lead should make that call.

**D4 — make the schema-dump deferral explicit (low, scope honesty).**
dbmate produces a `db/schema.sql` dump; design-v1 simply omits it. Model-v1 Risk
D recommends deferring it deliberately (a faithful dump shells out to
`pg_dump`/`sqlite3`, which conflicts with zero-deps). **Proposal**: add a one-line
"Non-goals / deferred (v1)" note naming schema-dump as explicitly out of scope,
so the direction's "familiar dbmate DX" promise is honestly bounded and
decomposition does not silently drop a feature dbmate users expect.

**D5 — keep the duplicate-INSERT idempotency dialect-neutral (low, boundary).**
§2.5's "a duplicate `INSERT` is caught and treated as already-applied" requires
classifying a unique-violation, which means inspecting driver-specific error
shapes — a leak across the `Db` boundary. **Proposal**: rely on the
**re-check-inside-`BEGIN IMMEDIATE`** as the primary, dialect-neutral idempotency
mechanism (it makes the duplicate INSERT essentially unreachable), and treat the
`version` PK purely as a loud backstop — if you must absorb the violation, do it
by re-SELECTing the version after the failed insert (dialect-neutral) rather than
parsing the driver error. This keeps `MigrationError` classification out of
driver internals.

---

## Cross-Artifact Coherence Assessment

Overall coherence is **high**. Direction → model → design form one chain: the
dbmate convention is adopted as the ubiquitous language (direction §4 / model §3
/ design §2.1), "supports major databases" is consistently re-grounded as
"dialect-correct bookkeeping + app-supplied driver" across all three, and the
per-tenant path is treated as the phased, higher-uncertainty increment everywhere
(direction §4 phasing, design ticket order 6 `depends_on` 4).

Two coherence items to close:

- **X1 — dry-run falls through the gap.** The direction names dry-run as a
  mitigation (Risk table, Persona C); the model treats `Plan` as a pure,
  apply-free value; but the design's CLI has no dry-run command. The structural
  pieces exist (`planMigrations` is already side-effect-free) — this is purely an
  un-wired promise. **Proposal**: add a plan-only / `--dry-run` rendering to the
  design's CLI (`up --dry-run` and/or `status` already does most of it) and a
  decomposition ticket, so the direction's trust mitigation is actually built.
  This is the one place a direction commitment is not yet represented in the
  design.

- **X2 — the in-house-vs-`persistence`-policy reconciliation needs Planner
  ratification.** Model-v1 §3 flags that building this in-house *appears* to
  contradict `implementation/persistence` ("adopt established frameworks as-is").
  The design's Policies section lists `persistence` but does not address the
  tension; the direction's §4 makes the business case (sovereignty/trust for a
  tool that touches production data) which is the *resolution* — adopt dbmate's
  **convention** verbatim, sovereign only the **implementation**, exactly as
  plgg-bundle did vs vite. **Proposal**: the Planner explicitly ratifies this as
  a recorded decision (it is a business/policy call, not a structural one) and the
  Constructor adds one line to the `persistence` policy entry noting "convention
  adopted as-is; implementation in-house per the plgg-bundle precedent," so the
  Coding Phase has the reconciliation on record rather than as an open tension.

No contradictions found between the artifacts — only the two unwired/​unstated
commitments above. With D2, D3, and X1 folded in, the design faithfully delivers
the direction's promised DX.
