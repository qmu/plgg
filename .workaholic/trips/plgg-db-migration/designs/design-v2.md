# Design v2

- **Author**: Constructor
- **Status**: approved (consensus — all three round-1 reviews Approve, no
  Request-revision, no escalation)
- **Reviewed-by**: Planner, Architect, Constructor
- **Supersedes**: design-v1.md (folds in the round-1 agreed/ruled items)

---

## Content

### 0. What changed from v1 (consensus rulings folded in)

1. **`execScript` seam** — a **required** (not optional) additive
   `execScript(text)` on `plgg-sql`'s `Db` seam + a `runScript(db)(text)`
   pipeline step folding to `SqlError`; the `;`-statement-splitter is **dropped
   entirely**. Lives in **plgg-sql** (seam owner); it is **ticket #1**, and every
   apply/rollback ticket `depends_on` it.
2. **Canonical domain vocabulary** (Architect's) adopted: `MigrationDir`,
   `AppliedVersion`, `SchemaMigrations`, `Plan`, `Migrator`, `TenantDb`/
   `TenantId`, a `resolveTenantDb` seam, `down: Option<SoftStr>` (`None` =
   irreversible, fails loudly), and per-migration `upTransaction`/
   `downTransaction` flags. Dialect SQL is pure → **domain, not vendors**
   (`vendors/` is reserved for the fs I/O ACL).
3. **SQLite-first phasing** — honest framing of "supports major databases" (§2.3).
4. **Dry-run / plan-preview** — the pure `planMigrations` is exposed as a
   non-mutating surface (`status` + `--dry-run`), serving the AI-agent persona
   and acting as the destructive-operation-trust mitigation (§2.4).
5. **Per-tenant** — best-effort idempotency **in v1** (dialect-neutral),
   full cross-process distributed coordination deferred to v1+ (§2.5).
6. **Risk B** wrap predicate fixed; **schema.sql dump** is an explicit v1
   non-goal (§5).

### 1. Scope and Inventory

#### 1.1 What `plgg-db-migration` is

A minimal, dependency-free schema-migration tool reproducing the dbmate
developer experience — one `.sql` file per migration carrying both an `up` and a
`down` section, applied incrementally, with a `schema_migrations` table tracking
what has run — built on `plgg` + `plgg-sql` with **zero new external
dependencies and no native binding**, plus an on-demand per-tenant SQLite
migrator. It exposes a programmatic API (the domain usecases) and a thin CLI
(`new`/`up`/`down`/`status`).

#### 1.2 Grounding and the gap that shapes scope

`plgg-sql` already provides everything needed to talk to a database **without
importing a driver**: the `Db` seam (`all`/`run`/`begin`/`commit`/`rollback`,
`packages/plgg-sql/src/Db/model/Db.ts`), the injection-safe `sql` template
(`packages/plgg-sql/src/Sql/model/Sql.ts`), and the `query`/`exec`/`transaction`
pipeline steps (`packages/plgg-sql/src/Db/usecase/`). It ships **no concrete
drivers** — only the seam; the example wires `node:sqlite`. Two consequences:

- We add **no** `pg`/`mysql2`/SQLite driver to this package. The application
  supplies the `Db` (zero new deps; see Policies).
- What spans engines is therefore **not** connection code but the
  *dialect-dependent SQL the tool itself emits* (the `schema_migrations` DDL and
  the version insert/delete) plus whether DDL can be transaction-wrapped — a
  small declarative **`Dialect`** the caller selects, not a driver matrix.

**One required seam change.** A migration body is trusted, developer-authored,
frequently multi-statement raw DDL/DML with no parameters. `Db.run(sql)` uses
`conn.prepare(text).run(...)`, and a prepared statement compiles a single
statement (the example reaches for `conn.exec("BEGIN")` for exactly this
reason). So `run` cannot apply a real migration body. We add a **required**
`execScript(text: SoftStr): Promise<void>` to the `Db` type and a sibling
`runScript(db)(text)` pipeline step that folds rejections into `SqlError`. The
`;`-splitter alternative (a v1 risk) is dropped — multi-statement execution is
delegated to the driver that already does it correctly. Required (not optional)
so the migrator depends on it unconditionally and the compiler forces every `Db`
implementer to provide it; breaking-change-allowed (plgg is its own only
consumer).

#### 1.3 Component inventory (`directory-structure` + `coding-standards`)

New package `packages/plgg-db-migration/`, built by `plgg-bundle`, tested by
`plgg-test` (>90% gate), modeled on `plgg-bundle`'s CLI-package shape:

```
packages/plgg-db-migration/
  bin/plgg-db-migration.mjs        launcher (self-alias hook → cli.ts)
  src/
    index.ts                       public re-exports (domain API)
    domain/
      model/                       Version, Migration, MigrationDir,
                                   AppliedVersion, SchemaMigrations, Plan,
                                   Dialect, Migrator, TenantId, TenantDb,
                                   MigrationError  (pure types + casters)
      usecase/
        parseMigration.ts          dbmate-marker parser (pure)
        readMigrations.ts          fs → ordered MigrationDir
        dialectSql.ts              per-Dialect DDL + insert/delete (pure)
        ensureSchemaMigrations.ts  CREATE TABLE IF NOT EXISTS
        listApplied.ts             SELECT → SchemaMigrations
        planMigrations.ts          pure Plan diff (dry-run surface)
        applyMigration.ts          run up/down body + record/unrecord
        migrateUp.ts               apply pending
        migrateDown.ts             roll back last applied (or --to)
        status.ts                  render Plan (non-mutating)
        newMigration.ts            scaffold a timestamped up/down .sql
        migrateTenant.ts           on-demand per-tenant SQLite
    entrypoints/
      cli.ts                       new | up | down | status (+ --dry-run)
    vendors/
      fs.ts                        node:fs/path ACL (read dir, read/write file)
```

Migration `.sql` files live under the consuming repo's
`databases/<db>/migrations/` slot (`directory-structure` + `persistence`), never
inside the package — the package is the engine, the migrations are project data.

### 2. Implementation Approach

#### 2.1 Single-file up/down parser (dbmate-style)

Format (dbmate-compatible):

```sql
-- migrate:up
CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL);

-- migrate:down
DROP TABLE users;
```

`parseMigration(text): Result<{ up: SoftStr; down: Option<SoftStr>;
upTransaction: Bool; downTransaction: Bool }, MigrationError>`:

- Locate the `-- migrate:up` / `-- migrate:down` marker lines (tolerant of
  surrounding whitespace; keyword case-sensitive). Body before/after the markers.
- Honor a `transaction:false` directive on a marker line → the corresponding
  `*Transaction` flag is `false` (default `true`). This expresses statements that
  cannot run inside a transaction even on transactional engines (e.g. Postgres
  `CREATE INDEX CONCURRENTLY`).
- Missing `-- migrate:up` → hard `Err`. Missing down → `None` (irreversible).
- The parser keeps each body **whole** — no `;`-splitting; the body is applied as
  one trusted script via `runScript` (§2.2). Pure (text in, `Result` out), fully
  unit-testable; fs lives in `vendors/fs.ts`, composed by `readMigrations`.

`Version` is the branded 14-digit filename prefix; `MigrationDir` is the ordered,
unique-checked `ReadonlyArray<Migration>` (duplicate/unordered → `MigrationError`).

#### 2.2 `schema_migrations` + apply/rollback

- `ensureSchemaMigrations(db, dialect)` — `CREATE TABLE IF NOT EXISTS
  schema_migrations (version <type> PRIMARY KEY, applied_at <ts default>)`;
  column type from the `Dialect`; idempotent.
- `listApplied(db)` — `SELECT version, applied_at … ORDER BY version` →
  `decodeRows` → `SchemaMigrations`.
- `applyMigration(migrator)(migration)` — run the `up` body via `runScript`, then
  `INSERT` the version. Wrap in `plgg-sql`'s `transaction` **iff**
  `dialect.supportsTransactionalDdl && migration.upTransaction`; otherwise run
  fail-forward. The down counterpart runs the `down` body (`None` →
  `Err(IrreversibleMigration)`) then `DELETE` the version.
- `migrateUp(migrator)` — `planMigrations` → fold `pending` through
  `applyMigration`, stop at first `Err`. `migrateDown(migrator)` — roll back the
  single most-recent applied migration (v1 default), with `--to <version>` as a
  supported target. All steps return `PromisedResult<_, MigrationError |
  SqlError>` and compose with `proc`/`pipe`; no `throw` in the domain.

#### 2.3 Multi-DB dialect strategy (SQLite-first)

`Dialect = { name: "sqlite" | "postgres" | "mysql"; supportsTransactionalDdl:
Bool }` (literal union, exhaustive `match`). The per-engine SQL the tool authors
(`schema_migrations` DDL + version insert/delete) lives in pure
`domain/usecase/dialectSql.ts`, selected by `match` on `dialect.name`, so a
fourth engine is a compile error and a half-add is impossible.

**Honest "supports major databases" framing (Planner-ratified):**

- **SQLite** is the only engine runnable out of the box — `node:sqlite` is built
  into Node, zero deps, no native binding — and it is what the per-tenant
  headline needs. It is the first-class, fully-tested target.
- **PostgreSQL / MySQL** are "supported" in the precise sense that the tool emits
  dialect-correct bookkeeping and runs against any conforming `Db`. The
  application supplies a `Db` **adapter** meeting a documented contract: it must
  (a) accept `plgg-sql`'s `?` placeholders (rewriting to the engine's form, e.g.
  `$1` for Postgres) and (b) implement `execScript`. A **reference Postgres
  adapter is shipped example-only** (over the app's own `pg`, never a package
  dependency).
- The tool does **not** translate SQL between engines — a project targets one
  engine and authors that engine's SQL (dbmate's model). The `Dialect` covers
  only the SQL the tool emits.

#### 2.4 CLI / programmatic API + dry-run

The programmatic API is the domain layer (config-first/data-last steps that drop
into a caller's `proc` chain). The CLI (`entrypoints/cli.ts`, dispatched by
`bin/plgg-db-migration.mjs`, modeled on `plgg-bundle`'s thin Result→exit-code
shell) offers:

- `new <name>` — `newMigration`: write
  `databases/<db>/migrations/<ts>_<name>.sql` with the up/down skeleton.
- `up [--dry-run]` — `ensureSchemaMigrations` then `migrateUp`; `--dry-run`
  returns the `Plan` (pending list) **without applying**.
- `down [--to <version>] [--dry-run]` — `migrateDown`; `--dry-run` previews what
  would roll back.
- `status` — render the `Plan` (applied vs pending; flags down-less migrations).
  Non-mutating by construction.

**Dry-run / plan-preview** is the apply-free `planMigrations` exposed both
programmatically (the step returns the `Plan`) and on the CLI (`--dry-run` /
`status`). It serves the AI-agent operator persona (observable, idempotent,
machine-readable state) and is the primary **destructive-operation-trust**
mitigation: an operator (human or agent) sees exactly what `up`/`down` will do
before it runs. The CLI is the only place `throw`/`process.exit` lives; the `Db`
+ `Dialect` + migrations dir come from a project config the CLI dynamic-imports
(the `bundle.config.ts` pattern), keeping the package driver-free.

#### 2.5 On-demand per-tenant SQLite migrator

`migrateTenant` brings a per-tenant SQLite database to head **lazily, on first
access**. It is thin orchestration over `ensureSchemaMigrations` /
`planMigrations` / `applyMigration` (not a parallel implementation). *Where* a
tenant DB lives is an app concern behind a `resolveTenantDb: (id: TenantId) =>
PromisedResult<TenantDb, MigrationError>` seam, keeping the tool ignorant of
tenant topology and testable with an in-memory `:memory:` `Db`.

```
migrateTenant(config)(tenantId):
  inside a per-tenantId critical section:
    resolveTenantDb → ensureSchemaMigrations → listApplied → planMigrations
    → if pending non-empty: fold through applyMigration; else no-op
```

**Concurrency guard (v1, dialect-neutral):**

- **In-process**: a per-`tenantId` keyed mutex (a `Map<TenantId, Promise<…>>`)
  so concurrent requests in one process await a single run; the entry is cleared
  after settlement (success or failure) so a later request can retry.
- **Within/across processes**: each `applyMigration` opens its transaction with
  SQLite write-lock semantics (`BEGIN IMMEDIATE`) and **re-reads applied versions
  inside the lock** before applying; the `version` primary key makes a racing
  double-apply a safe failure (a unique violation surfaced as a `MigrationError`)
  rather than corruption. **Idempotency is dialect-neutral** — we rely on the PK
  + in-lock re-check, **not** on parsing driver-specific duplicate-key error
  strings.
- Recommend `busy_timeout` / WAL on the tenant `Db` at the seam (set by the
  app's `resolveTenantDb`).

**v1 promise:** "no corruption within or across processes; single-run
coordination within a process." Full cross-process *distributed* coordination
(e.g. a lease/lock service across many Node instances) is **deferred to v1+**.

**Proactive-PoC gate:** the **concurrent cold-start race test** (two simultaneous
first-touch requests for one fresh tenant → exactly one applied run, no
corruption) is the explicit verification gate for the per-tenant ticket — the
genuinely novel surface is proven small before being relied on. The core tickets
(1–6) deliver standalone value: if the per-tenant path is later reshaped, the
single-database tool stands on its own.

### 3. Quality Strategy

- **Type discipline**: no `as`/`any`/`ts-ignore` (CLAUDE.md hard rule); `unknown`
  at fs/JSON boundaries through validators; errors as tagged `Box` values on the
  `Result` channel; absence as `Option`; exhaustive `match` over `Dialect.name`.
  `scripts/tsc-plgg.sh`.
- **Coverage > 90%** (`plgg-test.config.json` `threshold: 91`, `index.ts`
  excluded). The pure core — `parseMigration`, `planMigrations`, `Version`,
  `dialectSql` — is exhaustively unit-tested without a DB. DB usecases run
  against in-memory `node:sqlite`, covering apply / rollback / idempotent re-run /
  irreversible-migration / concurrent-tenant-race.
- **Formatting**: own `.prettierrc.json`, `printWidth: 50`.
- **Idioms**: `pipe`/`proc`/`cast`/`flow`, config-first/data-last steps reusing
  `plgg-sql`'s `query`/`exec`/`transaction`/`runScript` verbatim.

### 4. Delivery Plan

Dependency-ordered tickets (the Decomposition output):

1. **plgg-sql `execScript`/`runScript` seam** — required seam method + pipeline
   step + tests. *(no deps; prerequisite for all apply work)*
2. **Scaffold** `packages/plgg-db-migration/` (bundler/test/layout/bin) + the
   **domain models** (Architect's vocabulary incl. `Dialect` + `MigrationError`).
   *(no deps)*
3. **Parser + fs ACL + MigrationDir** — `parseMigration` (pure), `vendors/fs.ts`,
   `readMigrations`. *(deps: 2)*
4. **schema_migrations + planMigrations (dry-run) + apply/rollback** — dialect
   SQL (domain), `ensureSchemaMigrations`, `listApplied`, `planMigrations`,
   `applyMigration`, `migrateUp`, `migrateDown` (`--to`), `status`. *(deps: 1, 3)*
5. **CLI** — `new`/`up`/`down`/`status` (+ `--dry-run`) + `newMigration`.
   *(deps: 4)*
6. **On-demand per-tenant SQLite migrator** — `migrateTenant` + `resolveTenantDb`
   seam + keyed mutex + `BEGIN IMMEDIATE` re-check + the concurrent-cold-start
   PoC gate. *(deps: 4)*
7. **Example + docs + reference Postgres adapter** — runnable `example.ts`,
   README + the `Db`-adapter contract, example-only Postgres adapter. *(deps: 5, 6)*

#### Decomposition note

The committed queue splits item 2 into two tickets — a package **scaffold** and
the **domain models** — because the scaffold is config/tooling and the models are
domain logic, independently implementable and reviewable. So the queue is 8
tickets; the dependency spine is unchanged.

### 5. Risk Assessment

- **MySQL non-transactional DDL** (medium) — a failed multi-statement `up` can
  leave the schema half-applied with no ledger row. *Mitigation*: wrap predicate
  `dialect.supportsTransactionalDdl && migration.upTransaction`; document the
  partial-apply state (manual repair + the loud unique-version failure on re-run).
- **Placeholder mismatch** (medium) — a Postgres `Db` that doesn't rewrite
  `?`→`$n` breaks the tool's own ledger queries. *Mitigation*: the `Db`-adapter
  contract states the requirement; the reference adapter demonstrates it; the
  SQLite/MySQL `?` path is the tested default.
- **Per-tenant cold-start race** (high, designed-for) — *Mitigation*: §2.5
  keyed mutex + `BEGIN IMMEDIATE` re-check + version-PK; the concurrent-cold-start
  test is the PoC gate.
- **Driver scope creep** (low, governance) — pressure to bundle `pg`/`mysql2`.
  *Mitigation*: hold the line; the app supplies the `Db`.
- **schema.sql dump** (ruled out) — dbmate's `schema.sql` dump shells out to
  `pg_dump`/`mysqldump`/`sqlite3`, an external-binary/native dependency. **v1
  non-goal**; the up/down + `schema_migrations` core is the load-bearing DX.

## Policies

(Carried from v1; the list each ticket propagates.)

- `implementation/directory-structure` — new package under `packages/`;
  `src/{domain/{model,usecase},entrypoints,vendors}` split; migrations in the
  repo `databases/<db>/migrations/` slot; pronounceable names.
- `implementation/coding-standards` — no `as`/`any`/`ts-ignore`/`null`/`enum`/
  `class`/`switch`; `unknown` boundaries, `Option`, `Result`, exhaustive `match`,
  `type` over `interface`, arrow functions; the three-part `src/` layout;
  Prettier `printWidth: 50`.
- `implementation/vendor-neutrality` — zero new external deps, no native binding:
  reuse the `plgg-sql` `Db` seam and the project's own `typescript`; the app
  supplies the driver. "smaller better" / plgg sovereignty.
- `implementation/type-driven-design` — branded `Version`/`TenantId`, tagged
  `Box` errors, `down: Option`, closed `Dialect` union; the compiler as primary
  feedback path.
- `implementation/functional-programming` — declarative, failures-as-`Result`,
  immutable data; `throw` confined to the CLI edge.
- `implementation/domain-layer-separation` — pure parser/planner/dialect SQL in
  `domain`; the single fs I/O boundary in `vendors/`.
- `implementation/persistence` — schema-first: migration files are the schema of
  record; `schema_migrations` tracks state; relational DB at the foundation;
  migrations in `databases/`.
- `implementation/test` — pure core exhaustively unit-tested; DB usecases against
  in-memory SQLite; the concurrent-cold-start PoC gate; >90% coverage.
- `design/per-tenant-database` — the on-demand per-tenant SQLite migrator is the
  automated tenant-provisioning/migration path this policy requires.
- `operation/ci-cd` — `up`/`down` are idempotent and CI-runnable; the CLI returns
  proper exit codes; `status`/`--dry-run` make state machine-readable for an
  AI/ops operator.

## Review Notes

Consensus reached at round 1 (all three Approve; no Request-revision, no
escalation). The single cross-artifact fracture — "any database by default"
(Direction) vs "SQLite-first" (Model + Design) — resolves to SQLite-first phasing
(§2.3), ratified by the Planner. This v2 folds in the agreed/ruled items; no
further review round is required before Decomposition.
</content>
