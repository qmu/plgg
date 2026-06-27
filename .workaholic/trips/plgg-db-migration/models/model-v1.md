# Model v1

- **Author**: Architect
- **Status**: under-review
- **Reviewed-by**: _(pending)_

---

## Content

`plgg-db-migration` is a schema-migration tool that reproduces the dbmate
developer experience — one `.sql` file per migration carrying both an up and a
down section, applied incrementally, with a `schema_migrations` table tracking
what has run — built in-house on the plgg framework with zero new dependencies
and no native bindings, and extended with an **on-demand, per-tenant SQLite**
migration path. This model is the bridge between that business intent and the
buildable structure: it maps the system, fixes the domain vocabulary, measures
how faithfully the plgg shape delivers the dbmate DX, audits the boundaries, and
names the components.

### 1. System Coherence Mapping

The package is the next member of the plgg "from scratch, smaller better"
family, and it inherits two existing substrates rather than inventing its own:

| Concern | Existing plgg asset reused | What `plgg-db-migration` adds |
| --- | --- | --- |
| Talk to a database | `plgg-sql`'s `Db` seam (`all`/`run`/`begin`/`commit`/`rollback`) — the library never imports a driver; the app supplies one | A `Dialect` companion to the `Db` so the tool knows *which* SQL to emit for its own bookkeeping |
| Run SQL as a pipeline step | `plgg-sql` `query`/`exec`/`transaction` (config-first, data-last, errors as values) | `applyMigration` / `migrateUp` / `migrateDown` steps in the same `proc` vocabulary |
| Build a package with no deps | `plgg-bundle` (dual ESM+CJS + `.d.ts`, zero new deps) | nothing new — it is just another consumer of the bundler |
| Core idioms | `plgg` (`pipe`/`proc`/`Result`/`Option`/`match`/`Box`/branded types) | branded `Version`, `Box`-tagged `MigrationError`, exhaustive `Dialect` matching |

The coherence claim: a migration is **the same kind of object** as everything
else in plgg-sql — a data-last step that takes input, talks to the `Db` seam,
and returns a `Result`. `request → validate → migrate → query → response` is one
pipe; `plgg-db-migration` simply contributes the `migrate` links. This is what
makes the package *cohere* with the framework instead of bolting a CLI tool onto
the side of it.

Crucially, multi-database support is achieved the same way plgg-sql achieves
driver independence: **by not shipping the database.** The `Db` seam is supplied
by the application (the example wires `node:sqlite`, which is built into Node and
needs no native binding; a Postgres or MySQL app supplies its own adapter). The
tool itself depends only on `plgg` and `plgg-sql`. This is how "supports major
databases" and "zero new dependencies / no native binding" hold simultaneously —
the dependency on a specific engine lives in the consumer, never in the tool.

### 2. Domain Model

The vocabulary, in dependency order (each term defined only in terms of the ones
above it). All names are pronounceable per the directory-structure policy.

- **`Version`** — a branded string ordinal identifying one migration, taken from
  the filename's timestamp prefix (`20260627205005`). Branded (not bare
  `SoftStr`) so a raw string can never be mistaken for a validated version, and
  so ordering is a total order the planner relies on. `asVersion` validates the
  shape at the filesystem boundary.

- **`Migration`** — a parsed single-file unit:
  `{ version: Version; name: SoftStr; up: SoftStr; down: Option<SoftStr>;
  upTransaction: Bool; downTransaction: Bool }`. `up` is the trusted,
  developer-authored DDL/DML body of the `-- migrate:up` section; `down` is
  `Option` because a migration may be irreversible (no `-- migrate:down`
  section) — modeled as `None`, never an empty string. The `*Transaction` flags
  carry dbmate's `transaction:false` directive (see §5, transactional-DDL risk).

- **`MigrationDir`** — an ordered, gap-checked sequence of `Migration` read from a
  directory: `ReadonlyArray<Migration>` sorted ascending by `Version`. The
  ordering invariant is the planner's foundation; duplicate or unparseable
  versions are a value-level `MigrationError`, not a throw.

- **`AppliedVersion`** — one row of the tracking table: `{ version: Version;
  appliedAt: SoftStr }`. The set of these *is* the database's recorded history.

- **`SchemaMigrations`** — the projection of "what the database believes it has
  run": the tracking table plus the `ReadonlyArray<AppliedVersion>` decoded from
  it. The table's own DDL is **dialect-specific** (its `CREATE TABLE` differs
  across SQLite/Postgres/MySQL) — the one piece of SQL the tool authors itself.

- **`Plan`** — the diff between `MigrationDir` (what exists on disk) and
  `SchemaMigrations` (what the DB has applied): `{ pending:
  ReadonlyArray<Migration>; applied: ReadonlyArray<AppliedVersion> }` for up;
  the single most-recent applied `Migration` for down. The `Plan` is computed as
  a pure function — no I/O — so it is trivially testable and the apply step is
  the only side-effecting one.

- **`Dialect`** — a closed literal union `"sqlite" | "postgres" | "mysql"`
  carried alongside the `Db`. It selects: the `schema_migrations` DDL, the
  version-insert/delete SQL, and whether per-migration transactional wrapping is
  honored (see §5). Exhaustive `match` over it (never `switch`) means adding a
  fourth engine is a compile error until every site is updated.

- **`Migrator`** — the bound configuration `{ db: Db; dialect: Dialect; dir:
  MigrationDir }` from which the data-last steps are partially applied
  (`migrateUp(migrator)`, `migrateDown(migrator)`), mirroring plgg-sql's
  `query(db)` / `transaction(db, …)` config-first shape.

- **`TenantDb`** — a per-tenant SQLite database located by a `TenantId`:
  `{ id: TenantId; db: Db; path: SoftStr }`. The on-demand flow resolves one of
  these, checks it against `SchemaMigrations`, and lazily brings it up to head.

- **`MigrationError`** — a `Box`-tagged error (`box("MigrationError")`) riding
  the `Result`/`proc` error channel exactly like plgg-sql's `SqlError`, with
  sibling variants for parse failure, gap/ordering violation, irreversible-down,
  and dialect mismatch. Composes with `SqlError` (the two unify as `E` in a
  `proc` chain).

### 3. Translation-Fidelity Analysis (dbmate DX → plgg idioms)

The business promise is "same developer experience as dbmate." dbmate is a Go
CLI; plgg-db-migration is a **library of pipeline steps plus a thin CLI
entrypoint.** Fidelity must be judged feature by feature.

| dbmate DX surface | plgg-idiomatic translation | Fidelity |
| --- | --- | --- |
| One `.sql` file, `-- migrate:up` / `-- migrate:down` sections | `parseMigration` splits the file into a `Migration` (`up: SoftStr`, `down: Option<SoftStr>`) | **High** — the file format is preserved byte-for-byte; the dev authors the identical artifact |
| `YYYYMMDDHHMMSS_name.sql` filename → version | branded `Version` from the prefix; `MigrationDir` sorts by it | **High** |
| `schema_migrations` table tracks applied versions | `SchemaMigrations` projection + `AppliedVersion` rows | **High** |
| `dbmate up` applies all pending | `migrateUp(migrator)` = `Plan.pending` folded through `applyMigration` | **High** |
| `dbmate down` rolls back the latest | `migrateDown(migrator)` runs the latest applied migration's `down`; `None` → loud `MigrationError` | **High**, with one honest divergence: an irreversible migration fails as a *value*, where dbmate errors at runtime — same outcome, plgg surfaces it typed |
| `dbmate new` scaffolds a timestamped file | CLI entrypoint writes the template | **High** |
| `dbmate status` | `Plan` rendered | **High** |
| `--no-dump-schema` / `schema.sql` dump | **Deferred / out of scope for v1** — flag to Planner; the schema-dump feature needs `pg_dump`/`sqlite3` shell-outs that conflict with zero-deps | **Gap — see Risk D** |
| `dbmate wait` (wait for DB up) | belongs to the app's `Db` seam, not the tool | **Reframed, not lost** |

The central fidelity question for the Architect is **not** per-feature — it is
the in-house decision itself. The `implementation/persistence` policy says
plainly: *"adopt as-is the long-established frameworks for schema definition and
migration… an existing framework is more readable and easier to evolve than
replacing it with our own bespoke operation."* On its face, building
plgg-db-migration **contradicts** that policy.

The resolution — and the load-bearing translation-fidelity claim of this whole
model — is the same one `plgg-bundle` made against `vite`: **we adopt the
established *convention* as-is while implementing it in-house.** plgg-db-migration
does not invent a bespoke migration *method*; it reproduces dbmate's exact,
widely-understood contract (single-file up/down, `schema_migrations`, timestamp
versions, `up`/`down`/`new`/`status`). A developer who knows dbmate is
immediately fluent. What is sovereign is only the *implementation*, for the same
reason plgg-bundle gave: a foundation tool earns the right to be in-house when it
removes a dependency/native-binding liability and the convention it reproduces is
stable and well-known. **This claim must be ratified by the Planner** (it is a
business/policy decision, not a structural one) — the model's job is to make the
trade explicit and to show the precedent that makes it coherent rather than
rogue.

### 4. Boundary Integrity Assessment

Four boundaries, assessed for whether dependency directions stay closed toward
the domain and whether each translation is honest.

1. **The `Db` seam (tool ↔ database engine).** Reused from plgg-sql intact. The
   domain layer depends on the `Db` *type*, never a driver — integrity holds.
   **One gap:** the `Db` seam exposes `run(sql: Sql)` for single prepared
   statements, but a migration body is **trusted, multi-statement, raw DDL**
   that does not bind parameters and that `prepare().run()` cannot execute as one
   call (the example reaches for `conn.exec("BEGIN")` precisely because of this).
   The seam needs an additive `exec`/`script(text)` capability for trusted raw
   scripts, OR the tool must statement-split. **Proposal:** extend the `Db` seam
   with one optional `exec(text: SoftStr)` method for trusted scripts; it is a
   purely additive change, keeps user-value SQL on the parameterized `run` path,
   and matches what the example already does informally. (This crosses into
   plgg-sql — coordinate with the Constructor; it is breaking-allowed per the
   project's "plgg is its own only consumer" stance.)

2. **The `Dialect` seam (tool ↔ SQL dialect).** This is the *new* boundary the
   tool must own. The only SQL the tool authors itself — the `schema_migrations`
   DDL and the version insert/delete — is dialect-specific. Integrity is
   preserved by making `Dialect` a closed union folded with exhaustive `match`,
   so the dialect-specific SQL lives in exactly one place and a new engine
   cannot be half-added. The developer-authored migration bodies are
   **deliberately outside** this boundary: they are per-target dialect by nature
   (see Risk A), exactly as in dbmate.

3. **The filesystem seam (tool ↔ migration files).** Reading the migration
   directory is `node:fs` I/O — it belongs in `src/vendors/` (anti-corruption
   layer), translating directory entries and file text into `Migration` values
   via `parseMigration`. The domain `usecase` functions take an already-parsed
   `MigrationDir`, so parsing and planning are pure and testable without a
   filesystem. Integrity holds as long as no `usecase` reaches for `node:fs`
   directly.

4. **The tenant-resolution seam (tool ↔ tenant topology).** *Where* a tenant's
   SQLite file lives, and how a `TenantId` maps to a path, is an
   application/deployment concern, not the tool's. The tool should accept a
   `resolveTenantDb: (id: TenantId) => PromisedResult<TenantDb, MigrationError>`
   supplied by the app (config-first), and own only the *migrate-on-demand*
   logic on top of it. Putting the resolver behind a seam keeps the tool
   ignorant of tenant topology and keeps the on-demand path testable with an
   in-memory `:memory:` `Db`.

### 5. Component Taxonomy & Structural Risks

**Taxonomy** — follows the canonical TypeScript layout (`domain` / `entrypoints`
/ `vendors`) from `implementation/coding-standards`, the layout `plgg-bundle`
already uses (note: this is the *current* standard; plgg-sql's older
`<Module>/{model,usecase}` layout should not be copied):

```
packages/plgg-db-migration/src/
  domain/
    model/        Version, Migration, MigrationDir, AppliedVersion,
                  SchemaMigrations, Plan, Dialect, Migrator, TenantDb,
                  MigrationError  (pure types + constructors + branded casters)
    usecase/      parseMigration, planUp, planDown            (pure, no I/O)
                  ensureSchemaMigrations, listApplied,
                  applyMigration, migrateUp, migrateDown        (Db-seam steps)
                  migrateTenant                                 (on-demand flow)
  vendors/        fs.ts      (read migration dir → text, node:fs ACL)
                  dialect.ts (per-Dialect schema_migrations DDL + insert/delete)
  entrypoints/    cli.ts     (up / down / new / status), index.ts (library API)
```

Dependencies close toward `domain/`; `entrypoints` and `vendors` may import
`domain`, never the reverse.

**Structural risks** the downstream design must answer:

- **Risk A — SQL dialect divergence (high).** "Supports major databases" cannot
  mean "one migration file runs on all of them": DDL differs (`SERIAL` vs
  `AUTOINCREMENT` vs `AUTO_INCREMENT`, type names, `IF NOT EXISTS` support).
  This is **inherent to dbmate too** — migration bodies are authored per target.
  The model's honest scope: the *tool* runs against any engine via the seam; the
  *migrations* are the developer's, per-dialect. Only the `schema_migrations`
  bookkeeping is the tool's responsibility to make dialect-correct (Boundary 2).
  Mitigation: state this scope explicitly so Planner does not over-promise
  "write once, run on any DB."

- **Risk B — transactional-DDL divergence (high).** PostgreSQL has
  transactional DDL (a failed migration rolls back cleanly); **MySQL does not**
  (DDL implicitly commits, so a multi-statement migration can leave the DB
  half-migrated with no `schema_migrations` row); SQLite mostly does. Wrapping
  every migration in plgg-sql's `transaction` is correct for PG/SQLite and a
  *false promise* on MySQL. Mitigation: the `upTransaction`/`downTransaction`
  flags on `Migration` (dbmate's `transaction:false` directive), and `Dialect`
  selecting whether wrapping is even attempted; document the MySQL partial-apply
  hazard so recovery (manual repair + the loud unique-version failure) is a
  known operational state, not a surprise.

- **Risk C — on-demand per-tenant concurrency (high, novel).** The lazy
  per-tenant path is the genuinely new design surface. Two concurrent requests
  for the same un-migrated tenant DB can both read an empty `schema_migrations`,
  both run `migrateUp`, and collide (double-apply, `SQLITE_BUSY` lock, or a
  corrupt half-state); a deploy can trigger a thundering herd across many
  tenants at once. Mitigation, layered: (1) an **in-process keyed mutex** on
  `TenantId` serializes migration per tenant within a process; (2) the
  **`schema_migrations` version PK is the idempotency anchor** — a racing
  double-insert fails *loudly* (unique violation → `MigrationError`) rather than
  corrupting; (3) SQLite `busy_timeout` / WAL mode set on the tenant `Db` at the
  seam; (4) the on-demand check (`Plan.pending` empty?) must run *inside* the
  per-tenant critical section, not before acquiring it. Cross-process
  coordination (multiple Node instances) is **out of v1 scope** and must be
  flagged to Planner as an operational boundary, not silently assumed away.

- **Risk D — schema-dump feature (medium).** dbmate's `schema.sql` dump shells
  out to `pg_dump`/`mysqldump`/`sqlite3`. That conflicts with zero-deps /
  no-native-binding. **Proposal:** scope it OUT of v1; the up/down + tracking
  core is the load-bearing DX. Surface to Planner as an explicit deferral, not a
  silent omission.

- **Risk E — `down` semantics & irreversibility (low).** Modeling `down` as
  `Option<SoftStr>` is faithful and safe (irreversible migration → `None` →
  typed failure on `down`), but the planner must define "down" as
  *last-applied-only* (dbmate's behavior) vs "down to a target version" — a
  scope question for the design, not a structural risk per se.

### Policy lens applied

- `implementation/persistence` — the governing policy; §3 reconciles in-house
  build vs "adopt established frameworks" (adopt the *convention*, sovereign the
  *implementation*). Also mandates FK-aware, schema-as-documentation migrations —
  the tool must not weaken that (it runs the developer's DDL verbatim).
- `implementation/directory-structure` + `coding-standards` — the §5 taxonomy.
- `implementation/vendor-neutrality` — zero new deps holds because the tool
  ships no driver (Risk A/D); SQLite path uses built-in `node:sqlite`.
- `implementation/type-driven-design` — branded `Version`, `Option<SoftStr>`
  down, closed `Dialect` union, `Box` errors; no `as`/`any`/`null`.
- `operation/*` — Risk B (partial-apply recovery) and Risk C (on-demand runtime
  concurrency, thundering herd) are operation-policy concerns the design must
  address, not just build-time ones.

---

## Review Notes

_(Reviewers add notes here in Step 2.)_
