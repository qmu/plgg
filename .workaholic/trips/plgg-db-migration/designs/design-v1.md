# Design v1

- **Author**: Constructor
- **Status**: draft
- **Reviewed-by**: (pending)

---

## Content

### 1. Scope and Inventory

#### 1.1 What `plgg-db-migration` is

A minimal, dependency-free database migration tool — dbmate-style developer
experience — built **on top of** `packages/plgg-sql`. One `.sql` file per
migration, each holding both an `up` and a `down` section, applied
incrementally, with applied versions tracked in a `schema_migrations` table. It
exposes a programmatic API (the domain layer) and a thin CLI (`new` / `up` /
`down` / `status`), plus an on-demand per-tenant SQLite migrator for
database-per-tenant deployments.

#### 1.2 Grounding in the existing code (and the gap that shapes scope)

`plgg-sql` already gives us everything the migrator needs to talk to a database
**without importing any driver**:

- `Db` (`packages/plgg-sql/src/Db/model/Db.ts`) — the driver seam:
  `all` / `run` / `begin` / `commit` / `rollback`, all async. The library never
  imports a driver; the **application** supplies a `Db`. The example wires one
  over `node:sqlite`.
- `sql` tagged template + `Sql` box (`packages/plgg-sql/src/Sql/model/Sql.ts`) —
  injection-safe parameterized SQL with `?` placeholders.
- `query` / `exec` / `transaction` (`packages/plgg-sql/src/Db/usecase/`) —
  pipeline steps that fold driver rejections into a value-level `SqlError` and
  drive commit/rollback from the `Result`, not from exceptions.

**The gap.** `plgg-sql` ships **no concrete drivers** — only the `Db` seam, and
its example only demonstrates `node:sqlite`. It does not "support PostgreSQL /
MySQL / SQLite" in the sense of bundling clients; it supports *any* database for
which the application supplies a `Db`. This directly shapes our scope:

- We **do not** add `pg` / `mysql2` / a SQLite driver to this package. The app
  brings its own `Db` (zero new deps for plgg-db-migration; see Policies).
- What spans PostgreSQL / MySQL / SQLite is therefore **not** connection code —
  it is the *dialect-dependent SQL the migrator itself emits* (the
  `schema_migrations` DDL, and whether DDL can be wrapped in a transaction). So
  the multi-DB surface is a small, declarative **`Dialect`** value the caller
  selects, not a driver matrix.

This is the conservative, "smaller better" reading of "supports major
databases": we own the dialect deltas; the app owns the connection.

#### 1.3 Component inventory (package layout per `directory-structure` + `coding-standards`)

New package `packages/plgg-db-migration/`, built by `plgg-bundle`, tested by
`plgg-test` (>90% gate), modeled on `plgg-bundle`'s CLI package shape (`bin/` +
`src/entrypoints/cli.ts`):

```
packages/plgg-db-migration/
  bin/plgg-db-migration.mjs        launcher (self-alias hook, hands to cli.ts)
  src/
    index.ts                       public re-exports (domain only)
    domain/
      model/
        Version.ts                 branded Version (the leading timestamp id)
        Migration.ts               Migration = { version, name, up, down }
        Dialect.ts                 Dialect value + postgres/mysql/sqlite consts
        MigrationPlan.ts           applied vs on-disk diff (pending up / down)
        MigrationError.ts          tagged Box errors (ride Result/proc channel)
      usecase/
        parseMigration.ts          dbmate-marker parser (text -> up/down)
        readMigrations.ts          load + sort .sql files into Migration[]
        ensureSchemaTable.ts       CREATE TABLE IF NOT EXISTS schema_migrations
        appliedVersions.ts         SELECT version FROM schema_migrations
        planMigrations.ts          diff dir vs applied -> MigrationPlan
        applyUp.ts                 run up stmts + record version (per dialect)
        applyDown.ts               run down stmts + unrecord version
        migrateUp.ts               apply all pending (ordered)
        migrateDown.ts             roll back the last applied (or to a target)
        status.ts                  applied/pending report
        newMigration.ts            scaffold a timestamped up/down .sql file
        migrateTenant.ts           on-demand per-tenant SQLite migrator
    entrypoints/
      cli.ts                       new | up | down | status command dispatch
    vendors/
      filesystem.ts                ACL over node:fs/path (read dir, read/write)
```

Migration `.sql` files live under the repo's `databases/<db>/migrations/` slot
(per `directory-structure` + `persistence`), **not** inside the package — the
package is the engine, the migrations are project data the CLI is pointed at.

### 2. Implementation Approach

#### 2.1 The single-file up/down parser (dbmate-style)

Migration file format (dbmate-compatible markers):

```sql
-- migrate:up
CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL);

-- migrate:down
DROP TABLE users;
```

`parseMigration : (text: SoftStr) -> Result<{ up; down }, MigrationError>`:

- Scan lines for the `-- migrate:up` and `-- migrate:down` marker lines
  (tolerant of surrounding whitespace; case-sensitive on the keyword).
- Everything between `up` and `down` (or EOF) is the up body; everything after
  `down` is the down body. Each body is split into statements on `;` at
  statement boundaries (a first cut splits on `;\n`; statement-aware splitting
  that respects string literals and `BEGIN…END` blocks is a documented v1
  limitation, mitigated by encouraging one statement per migration where
  dialect DDL is non-transactional — see §2.4).
- Missing `-- migrate:up` is a hard `Err` (`MissingUpSection`). A missing
  `down` is allowed (records as an empty/`None` down — an irreversible
  migration), surfaced in `status`.
- The parser is **pure** (text in, `Result` out) — no fs, fully unit-testable.
  fs reads are isolated in `vendors/filesystem.ts`; `readMigrations` composes
  the two.

Each migration's `Version` is the leading numeric timestamp of its filename
(`20260627181500_create_users.sql` -> `Version "20260627181500"`), branded so a
raw string can't masquerade as a version (mirrors `plgg-sql`'s `Sql` brand and
the house `Str`/`asStr` pattern). `name` is the human suffix.

#### 2.2 The `schema_migrations` table + apply/rollback logic

Schema (dialect-portable, emitted by `ensureSchemaTable` via `sql`):

```
schema_migrations ( version  <TEXT/VARCHAR>  PRIMARY KEY,
                    applied_at <timestamp default now> )
```

- `ensureSchemaTable(db, dialect)` — `CREATE TABLE IF NOT EXISTS …`; the column
  types come from the `Dialect` (e.g. `TEXT` on SQLite, `VARCHAR(255)` on
  MySQL). Idempotent.
- `appliedVersions(db)` — `SELECT version FROM schema_migrations ORDER BY
  version`; rows mapped with `plgg-sql`'s `decodeRows` into `ReadonlyArray<Version>`.
- `applyUp(db, dialect)(migration)` — runs the up statements via `exec`, then
  `INSERT INTO schema_migrations (version) VALUES (?)`. When the dialect
  `supportsTransactionalDdl` is true, the whole thing is wrapped in
  `plgg-sql`'s `transaction` so a mid-migration failure rolls the schema change
  **and** the version row back together. When false (MySQL), see §2.4.
- `applyDown(db, dialect)(migration)` — runs down statements, then `DELETE FROM
  schema_migrations WHERE version = ?`; an absent down section short-circuits to
  `Err(IrreversibleMigration)`.
- `migrateUp` = `planMigrations` -> fold pending over `applyUp` (stop at first
  `Err`). `migrateDown` rolls back the single most-recent applied version by
  default (dbmate semantics), with an optional target version.

Every step returns `PromisedResult<_, MigrationError | SqlError>` and composes
with `proc`/`pipe` — no `throw` in the domain layer.

#### 2.3 The multi-DB dialect strategy

A `Dialect` is a small declarative value, not a class hierarchy:

```
type Dialect = {
  name: "postgres" | "mysql" | "sqlite";   // literal union, exhaustive `match`
  schemaMigrationsDdl: Sql;                 // the CREATE TABLE for this engine
  supportsTransactionalDdl: Bool;           // wrap migrations in a txn or not
};
```

Three exported constants (`postgres`, `mysql`, `sqlite`). The caller picks one
and passes it alongside their `Db`. Differences handled:

- **`schema_migrations` DDL** — column type / `IF NOT EXISTS` spelling per
  engine, captured once in `schemaMigrationsDdl`.
- **Transactional DDL** — PostgreSQL and SQLite run DDL inside transactions
  (atomic migration); MySQL issues an implicit commit on DDL, so a migration
  can't be wrapped atomically. The flag drives whether we use
  `transaction(db, …)` or run statements + record fail-forward, with the
  non-atomic risk documented to the operator (§5).
- **The migration body itself is the author's responsibility.** The tool does
  not translate SQL dialects between engines — a project targets one engine and
  writes that engine's SQL (this is dbmate's model too, and keeps the tool
  small). The `Dialect` covers only the SQL *the tool emits*.

A note on the seam contract: `plgg-sql`'s `sql` emits `?` placeholders. The
app-supplied `Db` is responsible for any placeholder rewriting its driver needs
(e.g. `?` -> `$1` for `pg`). This is recorded as an integration contract and a
risk (§5), not solved inside this package.

#### 2.4 The CLI / programmatic API

Programmatic API is the domain layer (`migrateUp`, `migrateDown`, `status`,
`newMigration`, `migrateTenant`), all config-first/data-last so they drop into a
caller's `proc` chain — that **is** the API.

CLI (`entrypoints/cli.ts`, dispatched by `bin/plgg-db-migration.mjs`,
modeled on `plgg-bundle`'s thin shell that turns a `Result` edge into an exit
code):

- `new <name>` — `newMigration`: write `databases/<db>/migrations/<ts>_<name>.sql`
  pre-filled with the `-- migrate:up` / `-- migrate:down` skeleton.
- `up` — `ensureSchemaTable` then `migrateUp`; prints each applied version.
- `down` — `migrateDown` (last applied, or `--to <version>`).
- `status` — `status`: lists applied vs pending, flags any down-less migrations.

The CLI is the only place `throw`/`process.exit` lives (the framework edge per
`coding-standards`); the database connection (`Db`) and the chosen `Dialect`
come from a small project config the CLI imports (same dynamic-import-of-a-`.ts`
trick `plgg-bundle` uses for `bundle.config.ts`), so the package stays
driver-free.

#### 2.5 The on-demand per-tenant SQLite migrator

`migrateTenant` targets database-per-tenant SQLite deployments (one `.sql` file
per tenant), migrated **lazily on first access** rather than in a global batch:

```
migrateTenant(config) (tenantId) :
  1. locate the tenant DB file (config.tenantDbPath(tenantId))
  2. open a Db over it (config.openSqlite — app-supplied, sqlite Dialect)
  3. ensureSchemaTable + appliedVersions
  4. planMigrations against the shared migrations dir
  5. if pending: apply pending up migrations; else no-op
```

Concurrency-safe guard (two layers, because lazy migration races on the first
concurrent requests for a cold tenant):

- **In-process**: a per-`tenantId` promise map (a keyed mutex) so concurrent
  requests in one process await a single migration run, not N.
- **Cross-process**: each `applyUp` opens its transaction with SQLite's
  write-lock semantics (`BEGIN IMMEDIATE`) and **re-checks** the applied set
  inside the lock before applying — so a second process that already migrated is
  observed and the run becomes a no-op (idempotent by the `version` primary
  key; a duplicate `INSERT` is caught and treated as already-applied).

This composes the same domain usecases as the CLI path — `migrateTenant` is a
thin orchestration over `ensureSchemaTable` / `planMigrations` / `applyUp`, not
a parallel implementation.

### 3. Quality Strategy

- **Type discipline**: no `as` / `any` / `ts-ignore` (CLAUDE.md hard rule);
  `unknown` at the fs/JSON boundary funneled through validators; errors as
  tagged `Box` values on the `Result` channel; absence as `Option`; exhaustive
  `match` over the `Dialect.name` literal union. Verified by `scripts/tsc-plgg.sh`.
- **Test coverage > 90%** (`feedback/coverage_threshold`, `plgg-test.config.json`
  `threshold: 91`, `index.ts` excluded). The pure core — `parseMigration`,
  `planMigrations`, `Version` parsing, `Dialect` selection — is exhaustively
  unit-tested without a database. DB-touching usecases are tested against an
  in-memory `node:sqlite` `Db` (the example's seam), covering apply / rollback /
  idempotent re-run / irreversible-migration / concurrent-tenant-race.
- **Formatting**: own `.prettierrc.json`, `printWidth: 50`; no hand-packing.
- **Plgg idioms**: `pipe`/`proc`/`cast`/`flow`, config-first data-last steps
  reusing `plgg-sql`'s `query`/`exec`/`transaction` verbatim (shared pipeline
  vocabulary).

### 4. Delivery Plan

Decomposition into tickets at the Decomposition gate will follow this dependency
order (each independently implementable; `depends_on` noted):

1. **Package scaffold** — `packages/plgg-db-migration/` skeleton:
   `package.json`, `tsconfig*.json`, `.prettierrc.json`, `bundle.config.ts`,
   `plgg-test.config.json`, `bin/` launcher, `src/index.ts`. (no deps)
2. **Domain models** — `Version`, `Migration`, `Dialect` (+ three consts),
   `MigrationPlan`, `MigrationError`. (deps: 1)
3. **Parser + fs ACL** — `parseMigration` (pure, fully tested),
   `vendors/filesystem.ts`, `readMigrations`. (deps: 2)
4. **schema_migrations + apply/rollback** — `ensureSchemaTable`,
   `appliedVersions`, `planMigrations`, `applyUp`, `applyDown`, `migrateUp`,
   `migrateDown`, `status`. (deps: 2, 3)
5. **CLI + newMigration** — `entrypoints/cli.ts`, `newMigration`, the config
   import. (deps: 4)
6. **Per-tenant SQLite migrator** — `migrateTenant` + keyed mutex + race tests.
   (deps: 4)
7. **Example + README** — a runnable `example.ts` (mirrors `plgg-sql`'s) and a
   docs pass using `Str`/`asStr` (not `SoftStr`) in examples per
   `str_over_softstr`. (deps: 5, 6)

### 5. Risk Assessment

- **Naive statement splitting** (split on `;`) mishandles `;` inside string
  literals, dollar-quoted bodies, or `BEGIN…END`. *Mitigation*: document the
  one-statement-per-migration recommendation for v1; isolate the splitter so a
  statement-aware version is a contained later change. Severity: medium.
- **MySQL non-transactional DDL** — a failed multi-statement up migration can
  leave the schema half-applied with the version unrecorded. *Mitigation*: the
  `Dialect` flag makes this explicit; `status` shows the discrepancy; document
  fail-forward + manual repair. Severity: medium.
- **Placeholder mismatch** — a PostgreSQL `Db` that doesn't rewrite `?`->`$n`
  breaks the migrator's own `schema_migrations` queries. *Mitigation*: state
  the `Db` placeholder-normalization contract in the README; the SQLite/MySQL
  `?` path is the tested default. Severity: medium.
- **Per-tenant race on cold start** — two requests migrate the same fresh
  tenant DB at once. *Mitigation*: in-process keyed mutex + `BEGIN IMMEDIATE`
  re-check + `version` PK idempotency (§2.5). Severity: high, but designed for.
- **Driver scope creep** — pressure to bundle `pg`/`mysql2` to "really support"
  those engines would violate zero-new-dep / no-native-binding. *Mitigation*:
  hold the line — the app supplies the `Db`; we ship dialect deltas only.
  Severity: low (governance).

## Policies

This build answers to the following standard engineering policies (read each at
the Coding phase and judge implementation/review/testing against it):

- `implementation/directory-structure` — new package under `packages/`;
  `src/{domain/{model,usecase},entrypoints,vendors}` split; migration `.sql`
  files in the repo `databases/<db>/migrations/` slot; pronounceable names.
- `implementation/coding-standards` — no `as`/`any`/`ts-ignore`/`null`/`enum`/
  `class`/`switch`; `unknown` boundaries, `Option`, `Result`, exhaustive
  `match`, `type` over `interface`, arrow functions; the three-part `src/`
  layout. Prettier `printWidth: 50`.
- `implementation/vendor-neutrality` — zero new external dependencies and **no
  native binding**: reuse the `plgg-sql` `Db` seam and the project's own
  `typescript`; the application supplies the driver. Embodies plgg sovereignty /
  "smaller better".
- `implementation/type-driven-design` — branded `Version`, tagged `Box` errors,
  rich typing over the dialect union; the compiler as the primary feedback path.
- `implementation/functional-programming` — declarative, return-failures-as-
  `Result`, immutable data; `throw` confined to the CLI framework edge.
- `implementation/persistence` — schema-first: the migration files *are* the
  schema of record; `schema_migrations` tracks state; relational DB at the
  foundation. Migrations live in `databases/`.
- `implementation/test` — pure core exhaustively unit-tested; DB usecases tested
  against an in-memory SQLite `Db`; >90% coverage gate.
- `design/per-tenant-database` — the on-demand per-tenant SQLite migrator is the
  automated tenant-provisioning/migration path this policy requires for a
  database-per-tenant model; isolation decision recorded as the tool's reason
  for existing.
- `operation/ci-cd` — the migrator is a deploy-time/runtime step; `up` is
  idempotent and CI-runnable; the CLI returns proper exit codes (the
  `plgg-bundle` edge pattern) so a pipeline can gate on it.

## Review Notes

(Reviewers add notes here in `reviews/round-1-*.md`; author responses in
`reviews/response-constructor-to-*.md`.)
</content>
</invoke>
