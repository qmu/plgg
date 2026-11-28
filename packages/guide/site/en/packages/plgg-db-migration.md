# plgg-db-migration — Apply schema changes

Set `db`, `dialect`, and `migrationsDir` in `migrate.config.ts`. Run `npx plgg-db-migration new add_books` to create a SQL file. Put the forward change under `-- migrate:up` and its reversal under `-- migrate:down`.

Check pending changes with `status`, then apply them with `up`. The engine records applied versions in `schema_migrations`.

## Working with the API

`parseMigration(text) → Result<ParsedMigration, MigrationError>`

SQL before the up marker is a parse error. This prevents recording a version while silently dropping statements. Omitting down gives `None` for the reverse script. The dialect describes DDL behavior. Supply the actual database connection separately.

```ts
import { parseMigration } from "plgg-db-migration";

const up =
  "-- migrate:up\nCREATE TABLE books(title TEXT);";
console.log(parseMigration(up));
console.log(
  parseMigration("SELECT 1;\n" + up).__tag,
);
```

## Read the plan before applying it

`planMigrations`(dir, applied) compares files with recorded versions and returns a Plan without running SQL. Rollback defaults to the most recent version. With a target it visits all newer versions, newest first. A missing file for a recorded version is a failure.
