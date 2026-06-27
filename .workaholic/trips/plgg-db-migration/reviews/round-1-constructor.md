# Round 1 Review — Constructor

- **Reviewer**: Constructor (technical / engineering-quality lens)
- **Artifacts reviewed**: `directions/direction-v1.md` (Planner),
  `models/model-v1.md` (Architect)
- **Date**: 2026-06-27

---

## Artifact 1 — Model v1 (Architect)

**Decision: Approve with minor suggestions.**

The model is strong and converges with my design on the load-bearing insight
(ship no driver; the only dialect-specific SQL is the tool's own bookkeeping). I
adopt its richer domain vocabulary as canonical for decomposition. Two technical
concerns, each with a concrete proposal, plus the specific seam question the lead
asked me to weigh.

### On the `Db`-seam `exec(text)` proposal — I agree, with refinements

**Is the seam change required?** Yes. I verified the claim against the code. A
migration body is trusted, developer-authored, frequently multi-statement raw
DDL with no bound parameters. `plgg-sql`'s `Db.run(sql)` goes through
`conn.prepare(text).run(...)` (see `packages/plgg-sql/example.ts`), and
`node:sqlite`'s `prepare()` compiles a **single** statement — which is exactly
why the example reaches for `conn.exec("BEGIN")` for its multi-statement needs.
So `run` cannot apply a real migration body. The only alternatives are (a) the
naive statement-splitter I flagged as a medium risk in my own design (§5,
"naive `;` splitting") or (b) an additive raw-script capability on the seam.
Option (b) eliminates an entire risk class (string-literal / `BEGIN…END` /
dollar-quote splitting) by delegating multi-statement execution to the driver
that already does it correctly (`node:sqlite` `exec`, `pg` simple-query
protocol, `mysql2` `multipleStatements`). I agree the seam change is the right
call.

**Is it the minimal correct change?** Almost — but I have two refinements that
change a decomposition ticket:

1. **Make it required, not optional.** The Architect's wording ("one *optional*
   `exec(text)` method") would force the migrator to handle the method's absence
   — which means keeping the statement-splitter fallback alive, reintroducing
   the exact risk we are trying to delete, and modeling an `Option`/capability
   check the no-escape-hatch discipline shouldn't need. Since breaking changes
   are sanctioned (plgg is its own only consumer), make it a **required** member
   of the `Db` type so the migrator can depend on it unconditionally and every
   `Db` implementer is forced by the compiler to provide it.
   *Proposal*: `Db.execScript(text: SoftStr): Promise<void>` as a required seam
   method.

2. **Avoid the name collision and stay in the pipeline vocabulary.** `plgg-sql`
   already exports a usecase named `exec` (the DML pipeline step over
   `db.run`). Adding a seam method *also* called `exec` invites confusion at
   every call site. *Proposal*: name the seam method `execScript` (or `script`),
   and add a sibling pipeline step in `plgg-sql` — `runScript(db)(text)` folding
   the rejection into `SqlError` exactly like `query`/`exec` do — so the
   migrator's apply step composes in the same config-first/data-last vocabulary
   instead of touching `db.execScript` raw. Document it as **trusted text only,
   never user input** (the same trust contract `sql`'s static template chunks
   carry), since it deliberately bypasses the parameterized `Sql` box.

**Does it belong in plgg-sql or plgg-db-migration?** Unambiguously **plgg-sql**
— it is the seam owner. The `Db` type lives there; "execute a trusted raw
script" is a general capability (seeding, fixtures, DDL), not migration-specific.
Putting it in plgg-db-migration would force that package to reach around or widen
the seam type, which a no-`as` codebase cannot do cleanly. **Decomposition
consequence**: this becomes its own ticket in `plgg-sql` (seam method +
`runScript` step + tests), and every plgg-db-migration apply ticket
`depends_on` it. I will sequence it first.

### Concern A — dialect SQL placement: `domain`, not `vendors`

The taxonomy puts `dialect.ts` (per-`Dialect` `schema_migrations` DDL +
insert/delete) under `src/vendors/`. `vendors/` is the anti-corruption layer for
**external SDK/service types** (per `coding-standards` / `domain-layer-separation`);
the dialect SQL is our *own* pure, side-effect-free SQL construction with no
external type to corrupt — it reads as domain logic, and it must be unit-tested
without any I/O. `fs.ts` is a true vendor (it wraps `node:fs`); `dialect.ts` is
not.
*Proposal*: keep `fs.ts` in `vendors/`, but move the dialect SQL builders to the
domain layer (`domain/model/Dialect.ts` for the union + `domain/usecase/` for
the SQL builders, or a small `domain/dialect/`). This keeps the dependency
direction closed toward a pure, testable core and reserves `vendors/` for the
single genuine I/O boundary.

### Concern B — confirm the `Migration` transaction flags and `Plan` down-shape

I accept the Architect's additions over my v1 design and will carry them into
the tickets: `MigrationDir`, `AppliedVersion`, `SchemaMigrations`, `Plan` (I
drop my `MigrationPlan` name in favor of `Plan`), `Migrator`, `TenantDb` /
`TenantId`, the `resolveTenantDb` seam, and the `upTransaction` /
`downTransaction` flags (dbmate's `transaction:false`). The flags are a genuine
correctness improvement my design lacked — they handle statements that cannot
run inside a transaction even on transactional engines (e.g. Postgres `CREATE
INDEX CONCURRENTLY`). One thing to nail down so the apply ticket is
unambiguous:
*Proposal*: define the wrap decision as a single predicate —
`wrapInTransaction = dialect.supportsTransactionalDdl && migration.upTransaction`
(and the `down` analogue) — and define `Plan`'s down-shape as **last-applied
only** for v1 (dbmate default), with `--to <version>` recorded as a documented
optional extension, resolving the Architect's Risk E scope question.

---

## Artifact 2 — Direction v1 (Planner)

**Decision: Approve with observations.**

The value proposition, personas, and phasing are sound and the policy lens is
thorough; the phased "certain core first, uncertain per-tenant path verified
small" framing matches the engineering reality exactly. My concerns are about an
honest mapping of the headline promise onto what is actually buildable today,
given that `plgg-sql` ships no drivers.

### Concern A — "Migrate any of your databases" over-promises against the codebase

The one-sentence promise and Persona A ("a conventional single-database
PostgreSQL or MySQL application") read as if Postgres/MySQL support is on by
default. It is not, and the gap is concrete: the repository contains **no
Postgres or MySQL `Db` adapter** — only the `node:sqlite` example. `node:sqlite`
is the *single* engine that is runnable out of the box with zero new
dependencies and no native binding (it is built into Node). For Postgres/MySQL,
the application must itself supply a `Db` adapter over its own driver (`pg` /
`mysql2`) — including rewriting `plgg-sql`'s `?` placeholders to the engine's
form (`$1` for Postgres). That is a real adoption cost the direction currently
understates, and left implicit it would surface as a broken-out-of-the-box
experience.

*Proposal*: frame v1 as **SQLite-first** without abandoning the multi-DB claim.
Concretely: (1) SQLite is the only engine plgg-db-migration runs end-to-end with
zero deps, and it is also what the headline per-tenant feature requires — so it
is the natural proving ground; (2) Postgres/MySQL are "supported" in the precise
sense that the tool emits dialect-correct bookkeeping for them and runs against
any conforming `Db` — documented as a **`Db`-adapter contract** (must accept `?`
placeholders; must provide `execScript`) plus a **reference Postgres adapter
shipped as an example** (requiring the app's own `pg`, never a package
dependency). This keeps "supports major databases" true while making the
out-of-box runnable surface honest, and it dovetails with your own §4 phasing.

### Concern B — make the schema-dump deferral and Db-adapter contract explicit non-goals

The Architect's Risk D (schema.sql dump shells out to `pg_dump`/`sqlite3`) is a
hard conflict with zero-deps / no-native-binding; from the engineering side I
confirm it must be **out of v1** — shelling to an external binary is exactly the
dependency the package exists to avoid. The direction lists non-goals (not an
ORM, not a driver, not a service) but doesn't name these two.
*Proposal*: add to §3 boundaries / §6 assumptions: (1) **schema-dump /
`schema.sql` is a non-goal for v1** (the up/down + `schema_migrations` core is
the load-bearing DX); (2) **the tool depends on an app-supplied `Db` adapter
meeting a stated contract** — making A2's "relies on the stack's existing
connection capability" precise about who owns the driver and the placeholder
rewriting.

---

## Cross-Artifact Coherence

All three artifacts independently converge on the same load-bearing decision —
**the tool ships no database; multi-DB support is the app supplying a `Db`, and
the only dialect-specific SQL is the tool's own `schema_migrations`
bookkeeping** — which is the strongest possible sign the design is coherent. The
model's vocabulary is a clean superset of my design's, so the tickets will name
things one way.

There is exactly **one fracture to resolve at moderation/decomposition**: the
Planner's "any database, by default" optimism versus the Architect's and my
"SQLite is the only out-of-box-runnable engine; PG/MySQL need an app-supplied
adapter + placeholder rewriting." It resolves cleanly into **SQLite-first
phasing** — which is not a retreat but an alignment with the Planner's own
investment-phasing rationale (§4) and with Persona B (the per-tenant SQLite
headline feature). I will reflect that resolution in the ticket sequence:

1. `plgg-sql` seam — `execScript(text)` (required) + `runScript` step + tests
   *(prerequisite for all apply work)*.
2. plgg-db-migration scaffold; domain models (Architect's vocabulary incl.
   transaction flags); pure parser + `Plan`; SQLite dialect + apply/rollback;
   CLI; on-demand per-tenant SQLite migrator; example + a reference Postgres
   adapter (example-only) + README documenting the `Db`-adapter contract.

Net: I approve both artifacts (Model: minor suggestions; Direction: observations)
and judge the team ready to converge with these adjustments folded in.
</content>
