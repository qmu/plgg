# Coding Review — T5 (schema_migrations + planMigrations + apply/rollback) — Architect

- **Reviewer**: Architect (analytical / code + architectural review; no test execution)
- **Ticket**: `20260627210149-schema-migrations-apply-rollback.md`
- **Verdict**: **Approve with minor suggestions**

The load-bearing ticket. It is strong: the error channel is disciplined, the
Risk-B wrap predicate is exactly right, dialect SQL is compile-time exhaustive,
and apply/rollback share one branch set. Concerns below are low-severity polish
and forward notes; none blocks.

---

## 1. Error-channel discipline — clean, no leaks (✓)

End-to-end the channel is strictly `MigrationError | SqlError`, with **no `proc`**
anywhere (raw `.then`/`isOk`/`matchResult`/`reduce`), so no `Defect` arm appears.
The one place `InvalidError` exists — `decodeRows(asLedgerRow)` in `listApplied` —
is contained: `asLedgerRow` maps `asVersion`'s `MigrationError` *into* the
`InvalidError` channel `decodeRows` expects, and `listApplied` then re-surfaces any
decode failure as a `LedgerCorrupt` `MigrationError`. `InvalidError` never escapes
the seam. The conversion is sound.

**C2 (low — diagnosability).** `listApplied` collapses the decode failure to
`ledgerCorrupt("a schema_migrations row could not be decoded")` with `cause: None`
— discarding the `InvalidError`'s row-level detail. For diagnosing a genuinely
corrupt ledger that detail is exactly what an operator wants. **Proposal**: pass
the `decoded` `InvalidError` as the `cause` of `ledgerCorrupt` (the kind already
carries `cause: Option<unknown>`), so the "which row / why" survives.

## 2. Txn-aware apply (Risk B) — correct, atomicity verified (✓)

The wrap predicate is exactly model-v1 Risk B:
`dialect.supportsTransactionalDdl && m.upTransaction` (and `…&& m.downTransaction`
for rollback). `runThenRecord` runs the body via `runScript` then the ledger
insert/delete via `exec`, **fail-fast** (record only if the script succeeded).
Crucially, when `atomic`, `run` wraps the **whole** `op` (body **and** the version
record) in one `transaction(db, …)`, so the schema change and the ledger row
commit or roll back **together** — the invariant that matters. When not atomic
(MySQL) it fail-forwards, and the `run` doc documents the half-apply state +
the loud version-PK failure on the next run. Faithful to dbmate, faithful to the
design.

**Forward note (T8 docs, from my T1 review).** A migration body that *itself*
contains `BEGIN`/`COMMIT` while `upTransaction` stays `true` on a transactional
engine will double-`BEGIN` inside the outer wrap. The escape hatch exists
(`transaction:false` skips the wrap), but the tool can't detect a body-level
`BEGIN`, so this must be called out in the README authoring guidance.

## 3. dialectSql — exhaustive and correct (✓)

`SCHEMA_MIGRATIONS_DDL: Record<DialectName, SoftStr>` is **compile-time total** —
a fourth `DialectName` is a missing-key compile error, and indexing it by
`dialect.name` yields `SoftStr` (not `… | undefined`, since a `Record` over the
closed literal union has every key present). This is an equally-valid, arguably
cleaner alternative to the `match` the design mentioned — exhaustiveness is
preserved, which is what I asked for. SQLite DDL is correct and idempotent
(`IF NOT EXISTS`, `TEXT` PK, `datetime('now')` default); Postgres `VARCHAR(14)` PK
+ `TIMESTAMPTZ DEFAULT now()` and MySQL `VARCHAR(14)` + `TIMESTAMP DEFAULT
CURRENT_TIMESTAMP` are plausible (exercised via app `Db`). Nice touch:
`insertVersionSql` inserts **only** `version` and leans on the column default, so
the insert stays dialect-neutral (no `now()`-vs-`datetime()` divergence in the
tool's own DML). The `?`-placeholder/adapter-rewrite contract is correctly
deferred to T8.

## 4. Idempotency — sound (✓)

`migrateUp` = ensure → `listApplied` → `planMigrations` (Set-membership diff) →
`applyPending`. A re-run computes empty `pending` → no-op. A true cross-process
double-apply hits the version PK → loud `SqlError`. The applied set is read once
per `migrateUp` (correct for the single-process path); the per-tenant concurrency
re-check is T7's job, kept out of here — right separation.

## 5. migrateDown — correct dbmate semantics; new kinds coherent (✓)

`rollbackTargets`: default `applied.slice(-1)` (the single most-recent, since
`applied` is ascending); with `to`, every applied version strictly `> to`,
reversed to newest-first. Matches dbmate (`to` stays applied). `findMigration`
fails loudly with `MissingMigration` when the ledger references a version whose
`.sql` is gone — a real, distinct operational failure, not silent. `irreversible`
(`down: None`) → `IrreversibleDown` returned **before any SQL runs**, so the DB is
unchanged for that migration. `LedgerCorrupt`/`MissingMigration` are coherent
per-boundary kinds (same principle I endorsed in T3/T4).

*Expected-behavior note (document, not a defect):* `migrateDown(to)` across
several versions is fail-fast with committed progress — each migration is its own
atomic unit, the batch is not atomic across migrations (dbmate is identical). So a
`--to` that reaches an `IrreversibleDown` rolls back as far as it can (newest
first) then stops. Worth one README line.

## 6. status / dry-run — non-mutating *to user schema*, with one caveat (mostly ✓)

`status` ensures the ledger, reads applied, computes the pure `planMigrations` diff,
and applies **nothing** — correct for the dry-run / AI-agent-observability persona.

**C1 (my headline, low–medium).** `status` is not *strictly* read-only: on a fresh
database `ensureSchemaMigrations` **creates** the `schema_migrations` table. The
doc is honest ("only ensures the (empty) ledger exists"), and the table is the
tool's own bookkeeping (not user schema), so harm is minimal — but an AI/ops
operator running `status --dry-run` to *inspect* a database does not expect it to
**write**. A strictly read-only `status` would need to catch a "no such table"
`SqlError` and report "ledger not initialized / 0 applied" — but that classification
is dialect-specific (the same driver-error-inspection boundary leak I've flagged
before), so the current `ensure`-then-read is the **dialect-neutral** pragmatic
choice. **Proposal**: keep the implementation, but document in the README / the
AI-operator contract that `status`/`--dry-run` initializes the empty ledger table
if absent (it never touches user schema). Honesty over re-engineering.

## 7. T6 / T7 readiness — yes, with one T7 forward note (✓)

All steps are config-first over `Migrator`, so they drop straight into the CLI (T6)
and the per-tenant orchestration (T7) — `migrateTenant` will compose `ensure` +
`planMigrations` + `applyMigration` exactly as these are shaped.

**Forward note (T7, important).** `applyMigration`'s atomic path uses plgg-sql's
`transaction`, which issues a **plain `BEGIN`** (per the example's
`conn.exec("BEGIN")`). SQLite's plain `BEGIN` is *deferred* — it acquires the write
lock lazily on first write, leaving a window between T7's planned "re-read applied
inside the lock" and the first write where two cold-start requests can still
interleave. T7's design relies on **`BEGIN IMMEDIATE`** to take the write lock up
front. So T7 will need either a `BEGIN IMMEDIATE` transaction variant on the seam
or to set the locking mode at the tenant `Db` — the version-PK still backstops
correctness (loud failure, no corruption), but the *single-run* guarantee needs
the immediate lock. Plan for it in T7; nothing to change in T5.

## Formatting sweep (your non-blocking note)

Agree: keep T5 scoped (the revert was right) and do **one package-wide prettier
pass at T8**. The archived T3/T4 deviations are cosmetic and a single final sweep
is cleaner than touching archived files mid-stream. Branch coverage 98.36% is
above the 91% gate; the uncovered branches are the non-SQLite dialect SQL/error
arms exercised only via an app `Db` — expected and acceptable.

## Decision

**Approve with minor suggestions.** The apply/rollback engine is correct,
idempotent, dialect-exhaustive, and keeps the precise `MigrationError | SqlError`
channel with no `proc`/`Defect`/`InvalidError` leak. Fold **C2** (preserve the
ledger-decode cause) and **C1** (document that `status` initializes the ledger) at
your discretion; carry the two forward notes into **T7** (`BEGIN IMMEDIATE`) and
**T8** (body-`BEGIN` + `migrateDown --to` partial behavior). Nothing needs
re-review. T6 and T7 are unblocked.
