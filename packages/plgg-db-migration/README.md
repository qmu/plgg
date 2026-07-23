# plgg-db-migration

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

dbmate-style schema migrations for the plgg stack — each migration is **one
`.sql` file with both `up` and `down`**, tracked in a `schema_migrations` table,
applied incrementally. Built as first-class plgg code: **zero new external
dependencies, no native binding.** SQLite runs out of the box (`node:sqlite`);
PostgreSQL / MySQL are supported through an app-supplied `Db` adapter (see
[Db-adapter contract](#db-adapter-contract)).

It also provides an **on-demand, per-tenant** migrator: bring a tenant's SQLite
database up to head lazily on first access, exactly-once under a concurrent
cold-start.

See `example.ts` for a runnable end-to-end demo:

```
cd packages/plgg-db-migration && npx tsx example.ts
```

## Migration file format

One file per migration, named `<YYYYMMDDHHMMSS>_<name>.sql`, with dbmate markers:

```sql
-- migrate:up
CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE);

-- migrate:down
DROP TABLE users;
```

- The `up` section is required; an omitted `down` section makes the migration
  **irreversible** — rolling it back fails loudly (`IrreversibleDown`), the
  database is left unchanged.
- A section may opt out of the transaction wrap with a directive (for statements
  that cannot run inside a transaction, e.g. PostgreSQL `CREATE INDEX
CONCURRENTLY`):

  ```sql
  -- migrate:up transaction:false
  CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
  ```

- Migration bodies are run **verbatim** (multi-statement bodies are supported via
  the driver's script execution — no in-tool `;`-splitting). A body must **not**
  contain its own `BEGIN`/`COMMIT` unless it also sets `transaction:false`, or it
  will conflict with the outer transaction wrap.
- Migrations live in a `databases/<db>/migrations/` layout (one directory per
  database), modelling the real consumer placement — not inside this package.

## CLI

The package ships a `plgg-db-migration` bin. Commands:

| Command                 | Effect                                                       |
| ----------------------- | ------------------------------------------------------------ |
| `new <name>`            | scaffold `<timestamp>_<name>.sql` with the up/down skeleton  |
| `up`                    | apply all pending migrations (idempotent)                    |
| `down [--to <version>]` | roll back the last applied migration, or down to `<version>` |
| `status`                | print the pending/applied plan (non-mutating)                |

`up`/`down`/`status` accept `--dry-run` to preview the plan without applying.

The CLI reads a `migrate.config.ts` from the working directory (or
`PLGG_DB_MIGRATION_CONFIG`):

```ts
import {
  defineConfig,
  sqlite,
} from "plgg-db-migration";
import { open } from "./db"; // your node:sqlite Db seam (a value import)

export default defineConfig({
  db: open("app.sqlite"),
  dialect: sqlite,
  migrationsDir: "databases/app/migrations",
});
```

Two operational notes:

- **Build before running the CLI.** The bin loads the built `dist/cli.es.js`, so
  run `npm run build` first (the published package ships `dist`). A missing build
  fails loud-and-early with a clear message.
- **The config is loaded via Node's type-stripping**, so `migrate.config.ts`
  must be type-strippable: import only **values**, or use `import type` for
  types. A value-style import of a type will fail at runtime.

## Programmatic API

The CLI is a thin shell over the usecases; you can drive them directly:

```ts
import {
  migrator,
  sqlite,
  readMigrations,
  migrateUp,
  status,
  migrateDown,
} from "plgg-db-migration";

const dir = await readMigrations(
  "databases/app/migrations",
); // Result<MigrationDir>
// ...unwrap dir, then:
const m = migrator(db, sqlite, dir);
await migrateUp(m); // Result<Version[]>
await status(m); // Result<Plan>  (pending/applied; non-mutating)
await migrateDown(m); // roll back the last applied
await migrateDown(m, version); // roll back down to `version`
```

Every step returns a `PromisedResult<_, MigrationError | SqlError>` — failures
are values, never thrown.

## On-demand per-tenant migration

Bring a per-tenant SQLite database to head lazily, on first access:

```ts
import { migrateTenant, sqlite, asTenantId } from "plgg-db-migration";

const migrate = migrateTenant({
  resolveTenantDb: (id) => /* open + return the tenant's Db, as a Result */,
  dir,
  dialect: sqlite,
});

await migrate(tenantId); // Result<Version[]> — applied this run (empty if at head)
```

- `resolveTenantDb` is your seam: locate and open the tenant's SQLite `Db`
  (ideally with `busy_timeout` / WAL). The tool stays ignorant of tenant
  topology.
- Concurrency: an **in-process keyed mutex** coalesces a cold-start burst for one
  tenant into a single run; `BEGIN IMMEDIATE` takes the write lock up front and
  applied versions are re-checked inside it; the `schema_migrations` version
  primary key is the dialect-neutral idempotency backstop. **v1 guarantee: no
  corruption within or across processes; single-run coordination only within a
  process.**

## Db-adapter contract

"Supports major databases" is honest because the package ships **no driver**: the
app supplies a `plgg-sql` `Db`. SQLite (`node:sqlite`) needs no dependency.
For PostgreSQL / MySQL the app provides a `Db` adapter over its own driver that:

1. **Accepts `plgg-sql`'s `?` placeholders**, rewriting them to the engine's form
   (e.g. `$1, $2, …` for PostgreSQL).
2. **Implements `execScript(text)`** — running a trusted multi-statement script
   (a migration body) verbatim.

### Reference PostgreSQL adapter (example only — not a dependency)

This is illustrative app code; `pg` is the **app's** dependency, never this
package's:

```ts
import { Pool } from "pg"; // the APP's dependency
import { Db } from "plgg-sql";

// rewrite plgg-sql's `?` placeholders to Postgres `$n`
const toPg = (text: string): string => {
  let n = 0;
  return text.replace(/\?/g, () => `$${++n}`);
};

export const openPg = (pool: Pool): Db => ({
  all: async (s) =>
    (
      await pool.query(
        toPg(s.content.text),
        bind(s),
      )
    ).rows,
  run: async (s) => {
    const r = await pool.query(
      toPg(s.content.text),
      bind(s),
    );
    return {
      changes: r.rowCount ?? 0,
      lastInsertId: none,
    };
  },
  execScript: async (text) => {
    await pool.query(text); // pg runs multi-statement strings
  },
  begin: async () => {
    await pool.query("BEGIN");
  },
  commit: async () => {
    await pool.query("COMMIT");
  },
  rollback: async () => {
    await pool.query("ROLLBACK");
  },
});
```

## Limitations (v1)

- **MySQL has no transactional DDL.** A failed multi-statement migration on MySQL
  can leave a partial apply; recover by fixing forward. The version PK still makes
  a re-run safe (a duplicate insert fails loudly rather than double-applying).
- **Per-tenant cross-process coordination** beyond the SQLite write-lock +
  version-PK guarantees (a lease/lock service across many Node instances) is out
  of scope for v1.
- **Schema dump** (`schema.sql` via `pg_dump`/`sqlite3`) is a non-goal — it would
  require shelling out to native tools, reintroducing the dependency/native-binding
  liability this package exists to avoid.
- **`status` / `--dry-run` is non-mutating with respect to your schema**, but on a
  fresh database it creates the (empty) `schema_migrations` ledger so it can read
  it. It never touches user tables.
- **`down --to <version>` is fail-fast with committed progress** (dbmate-identical):
  it rolls back newest-first and stops at the first failure (e.g. an irreversible
  migration), leaving everything already rolled back committed.
- **`new <name>`** does not yet sanitize path separators in `<name>`; supply a
  plain identifier (the version timestamp is generated for you).
