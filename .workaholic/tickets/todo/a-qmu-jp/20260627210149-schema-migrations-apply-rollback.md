---
created_at: 2026-06-27T21:01:49+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, DB]
effort:
commit_hash:
category:
depends_on: [20260627210145-plgg-sql-execscript-seam.md, 20260627210148-parser-fs-and-plan.md]
---

# Implement `schema_migrations`, `planMigrations` (dry-run), and apply/rollback (SQLite dialect)

## Overview

The engine of the tool: create and read the `schema_migrations` ledger, compute
the pure `planMigrations` diff (the dry-run/preview foundation), and apply/roll
back migrations against the `plgg-sql` `Db` seam, all as `proc`/`pipe` steps that
fold to `Result`. SQLite is the first (and only fully runnable) dialect; the
`Dialect`-specific SQL is built in the **domain** layer (it is pure, no I/O — not
a `vendors/` concern), structured so Postgres/MySQL add only a new dialect value,
not a new code path.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — apply/rollback
  usecases in `src/domain/usecase/`; dialect SQL builders in the domain layer
  (`src/domain/usecase/` or `src/domain/dialect/`), not `vendors/`.
- `workaholic:implementation` / `policies/coding-standards.md` — exhaustive
  `match` over the `Dialect` union; no `as`/`any`/`ts-ignore`; Prettier 50.
- `workaholic:implementation` / `policies/type-driven-design.md` — the
  dialect-specific SQL lives in exactly one place keyed by the closed union, so a
  half-added engine is a compile error.
- `workaholic:implementation` / `policies/functional-programming.md` — every step
  returns `PromisedResult<_, MigrationError | SqlError>`; commit/rollback driven
  by the `Result` via `plgg-sql`'s `transaction`, not by exceptions.
- `workaholic:implementation` / `policies/persistence.md` — `schema_migrations`
  is the recorded state on a relational DB; the tool runs the developer's DDL
  verbatim (does not weaken schema-as-documentation).
- `workaholic:implementation` / `policies/test.md` — apply / re-apply
  (idempotent) / rollback / irreversible-down all tested against in-memory
  `node:sqlite`; coverage > 90%.

## Trip Origin

`.workaholic/trips/plgg-db-migration/designs/design-v2.md` §2.2 (schema_migrations
+ apply/rollback), §2.3 (dialect strategy), §2.4 (the `planMigrations` dry-run
surface), and §5 (Risk B). Wrap predicate =
`dialect.supportsTransactionalDdl && migration.upTransaction`; dialect SQL in
domain not vendors; down = last-applied-only with `--to <version>` supported
(per `reviews/round-1-constructor.md`).

## Key Files

- `packages/plgg-sql/src/Db/usecase/query.ts` (`query`/`exec`),
  `packages/plgg-sql/src/Db/usecase/transaction.ts` (`transaction`),
  `packages/plgg-sql/src/Sql/model/Sql.ts` (`sql`), and the new `runScript`
  (execScript ticket) - the seam steps these usecases compose.
- `packages/plgg-sql/src/Mapping/usecase/decodeRows.ts` - map ledger rows into
  `AppliedVersion`.
- `packages/plgg-db-migration/src/domain/model/` - `Dialect`, `Migration`,
  `Plan`, `SchemaMigrations`, `AppliedVersion`, `MigrationError`.

## Implementation Steps

1. Dialect SQL builders (domain): per-`Dialect` `schemaMigrationsDdl` (column
   type per engine: SQLite `TEXT`, Postgres `VARCHAR`, MySQL `VARCHAR(255)`) and
   the version insert/delete `Sql`, selected by exhaustive `match` on
   `dialect.name`. Implement SQLite fully; Postgres/MySQL builders defined so the
   union is exhaustive (their runtime validation is the example/adapter ticket).
2. `ensureSchemaMigrations(db, dialect)` — `CREATE TABLE IF NOT EXISTS
   schema_migrations (...)`; idempotent.
3. `listApplied(db)` — `SELECT version, applied_at FROM schema_migrations ORDER
   BY version` → `decodeRows` → `SchemaMigrations`.
4. `planMigrations(dir, applied): Plan` — pure diff of `MigrationDir` against
   `SchemaMigrations`: the ordered `pending` up-migrations plus the applied set;
   for down, select the most-recent-applied migration (or down-to a `--to`
   target). This pure function is the **dry-run/preview** data the CLI `status`
   and `--dry-run` consume — it performs no I/O and mutates nothing.
5. `applyMigration(migrator)(migration)` — run the `up` body via `runScript`,
   then `INSERT` the version. Wrap in `plgg-sql`'s `transaction` **iff**
   `dialect.supportsTransactionalDdl && migration.upTransaction`; otherwise run
   fail-forward. The down counterpart runs the `down` body (`None` →
   `Err(IrreversibleMigration)`) then `DELETE` the version.
6. `migrateUp(migrator)` — `planMigrations` → fold `pending` through
   `applyMigration`, stop at first `Err`. `migrateDown(migrator, to?)` — roll
   back the single most-recent applied migration by default, or down to `to`.
7. `status(migrator)` — render `planMigrations` (applied vs pending), flagging
   down-less migrations; non-mutating.
8. Tests per Implementation Policy `test.md` (incl. `planMigrations` for empty /
   partial / full / down-target); coverage > 90%.

## Considerations

- **MySQL non-transactional DDL**: when `supportsTransactionalDdl` is false a
  failed multi-statement `up` can leave the schema half-applied with no ledger
  row. This is documented as a known operational state (manual repair + the loud
  unique-version failure on re-run), not silently wrapped
  (`packages/plgg-db-migration/src/domain/usecase/applyMigration.ts`).
- The version primary key is the idempotency anchor: a re-applied version is a
  unique violation surfaced as a typed `MigrationError`, never a silent
  double-apply (`schema_migrations` ledger).
- `runScript` carries trusted text only; user input never reaches it — migration
  bodies are developer-authored (`packages/plgg-sql/.../execScript`).
- `planMigrations` must stay pure (no `Db` access): it takes the already-fetched
  `SchemaMigrations` so the dry-run surface never mutates and is trivially tested
  (`packages/plgg-db-migration/src/domain/usecase/planMigrations.ts`).
