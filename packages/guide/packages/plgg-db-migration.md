# plgg-db-migration

A **minimal schema-migration tool**, built from scratch
on [plgg](/packages/plgg/) and
[plgg-sql](/packages/plgg-sql). dbmate-style single-file
`up`/`down` migrations, a `schema_migrations` ledger, and
on-demand per-tenant SQLite — no third-party migration
framework. Ships a `plgg-db-migration` CLI bin.

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
