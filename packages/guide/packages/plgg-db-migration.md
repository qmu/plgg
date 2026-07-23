# plgg-db-migration

A **minimal schema-migration tool**, built from scratch
on [plgg](/packages/plgg/) and
[plgg-sql](/packages/plgg-sql). dbmate-style single-file
`up`/`down` migrations, a `schema_migrations` ledger, and
on-demand per-tenant SQLite — no third-party migration
framework. Ships a `plgg-db-migration` CLI bin.

## Writing an app with it

One `.sql` file's text becomes its `up`/`down` scripts as
one [`pipe`](/concepts/composition). Parsing is pure
(text in, [`Result`](/concepts/result) out), failures are
matched **by name**, and the optional rollback is an
[`Option`](/concepts/option) you fold — never a `null`:

```typescript
import {
  pipe,
  matchResult,
  matchOption,
} from "plgg";
import { parseMigration } from "plgg-db-migration";

const readSteps = (sql: string) =>
  pipe(
    parseMigration(sql), // Result<ParsedMigration, …>
    matchResult(
      // parse failed → the named reason as text
      (e) =>
        `cannot migrate: ${e.content.message}`,
      // parsed → the up script, plus its down half
      (m) =>
        pipe(
          m.down, // Option<SoftStr>
          matchOption(
            () => `${m.up} (no rollback)`,
            (down) => `${m.up} / ${down}`,
          ),
        ),
    ),
  );
```

Because parsing is pure data with no filesystem, the same
step feeds `readMigrations` (which adds the I/O seam),
`planMigrations` (the pure applied-vs-pending diff), and
`migrateUp` (which folds the plan through plgg-sql).

## Vocabulary

The tool covers the migration lifecycle as pure plgg
data, grouped by concern:

- **model** — `Migration`, `MigrationDir`, `Plan`,
  `Version`, `SchemaMigrations`/`AppliedVersion`,
  `Dialect`, `TenantId`/`TenantDb`, and the `Migrator` +
  `MigrateConfig` runtime records, each with its
  `as*`/validator builders.
- **failure** — `MigrationError` (a
  [`Box`](/concepts/tagged-data) union over a closed
  `kind`) with named constructors (`parseFailure`/
  `orderingViolation`/`irreversibleDown`/…) and the
  `migrationError$()` matcher.
- **read + plan** — `parseMigration`, `readMigrations`,
  `planMigrations`, `status`, `listApplied`,
  `ensureSchemaMigrations`, `dialectSql`.
- **apply** — `applyMigration`, `migrateUp`,
  `migrateDown`, `migrateTenant`, and `newMigration` to
  scaffold a timestamped file.

Every step returns a [`Result`](/concepts/result), so a
failed migration folds to a value instead of unwinding
the stack. The exact model and usecase signatures live in
the `plgg-db-migration` source.

## Why it exists

Migrations are just SQL plus a record of what has run.
plgg-db-migration keeps that record as plgg data and runs
each step through plgg-sql, so the whole flow is
[`Result`](/concepts/result)-typed and never throws:

```
plgg ── plgg-sql ── plgg-db-migration
```

## How it's organized

The domain usecases cover the migration lifecycle:

- **parseMigration** — split one migration file into its
  `up` and `down` halves; **readMigrations** loads the
  directory and **planMigrations** orders them.
- **ensureSchemaMigrations** — create the ledger table;
  **listApplied** reads what has run and **status**
  reports the diff.
- **migrateUp** / **migrateDown** — apply or roll back
  against the ledger; **migrateTenant** runs the plan for
  an on-demand per-tenant SQLite database.
- **newMigration** — scaffold a timestamped file;
  **dialectSql** adapts the SQL per dialect.

Every step returns a [`Result`](/concepts/result), so a
failed migration folds to a value instead of unwinding
the stack. The exact model and usecase signatures live in
the `plgg-db-migration` source.
