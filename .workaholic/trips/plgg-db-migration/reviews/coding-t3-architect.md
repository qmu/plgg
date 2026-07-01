# Coding Review — T3 (domain models) — Architect

- **Reviewer**: Architect (analytical / code + architectural review; no test execution)
- **Ticket**: `20260627210147-domain-models.md`
- **Verdict**: **Approve with minor suggestions**

---

## 1. Vocabulary fidelity to model-v1 / design-v2 — faithful (✓)

Every term from the canonical domain model is present, in the right shape:

| model-v1 term | T3 file | Shape check |
| --- | --- | --- |
| `Version` (branded, total order) | `Version.ts` | `Box<"Version",string>`, 14-digit `qualify`, `asVersion` validates at boundary, `compareVersion` total order ✓ |
| `Migration` (`down: Option`, txn flags) | `Migration.ts` | `down: Option<SoftStr>` (my D1), `upTransaction`/`downTransaction: Bool` default-true (my D3), `isReversible` via `matchOption` ✓ |
| `MigrationDir` (ordered, dedup) | `MigrationDir.ts` | branded `Box`, `asMigrationDir` sorts + rejects duplicate versions → `OrderingViolation` ✓ |
| `AppliedVersion` | `AppliedVersion.ts` | `{ version, appliedAt }` ✓ |
| `SchemaMigrations` | `SchemaMigrations.ts` | `ReadonlyArray<AppliedVersion>` + `isApplied` ✓ |
| `Plan` (pure diff) | `Plan.ts` | `{ pending, applied }`, documented apply-free (the dry-run surface, my X1) ✓ |
| `Dialect` (closed union) | `Dialect.ts` | `"sqlite"|"postgres"|"mysql"` + 3 consts with `supportsTransactionalDdl` ✓ |
| `Migrator` (config-first bind) | `Migrator.ts` | `{ db, dialect, dir }` ✓ |
| `TenantId` (branded) / `TenantDb` | `TenantId.ts` / `TenantDb.ts` | branded id + `{ id, db, path }` behind the resolver seam ✓ |
| `MigrationError` (Box, unifies w/ SqlError) | `MigrationError.ts` | see §3 ✓ |

Dialect-correctness defaults are right: `sqlite`/`postgres` transactional, `mysql`
`false` — exactly the wrap-predicate input T5 needs (model-v1 Risk B).

## 2. The added `TenantShape` kind — coherent, not scope creep (✓)

`MigrationErrorKind` adds `VersionShape` and `TenantShape` beyond my original
parse/ordering/irreversible/dialect set. Both are the **failure modes of the two
branded boundary casters** (`asVersion` → `versionShape`, `asTenantId` →
`tenantShape`). An error kind per branded-validation boundary is the correct,
type-driven shape — the alternative (folding them into `ParseFailure`) would blur
two genuinely different boundaries. `TenantShape` is not new surface; it is the
typed result of the tenant-id validation the per-tenant path (T7) already
requires. Coherent addition — keep it.

## 3. MigrationError structure & idioms — correct (✓)

`MigrationError` is a `Box<"MigrationError", { kind; message; cause: Option<unknown> }>`
— pure tagged data, not an `Error` subclass, so it rides the `Result`/`proc` error
channel and **unifies with `plgg-sql`'s `SqlError` as the `E`** of a shared `proc`
chain (the apply path in T5 returns `MigrationError | SqlError`). The `make(kind)`
curried builder + per-kind named constructors mirror `plgg-sql`'s `sqlError`
exactly, and `migrationError$` mirrors `sqlError$`. Branded types are built on
plgg primitives (`box`/`isBoxWithTag`/`isSoftStr`), absence is `Option`, no
exhaustive `match` is *due yet* (the Dialect fold lands in T4's `dialectSql`).
**Escape-hatch scan: clean** — no `as`/`any`/`ts-ignore`/`null`/`enum`/`class`/
`switch` in `src/domain/` (the `as` grep hits are all prose in doc comments).

A note I want on record (affirmation, not a concern): `Version`/`TenantId`/
`MigrationDir` use **structural** `Box` branding (tag + content qualification),
*not* the private-`Symbol` brand `plgg-sql`'s `Sql` uses. This is the right call
here: a forged `Version`/`TenantId` box must still pass re-qualification (14-digit
/ non-empty), so a forgery carries **no privilege** beyond "a valid string" —
unlike `Sql`, where the Symbol brand guards a *splice* privilege (forged → SQL
injection). The lighter brand is appropriate; the asymmetry with `Sql` is correct,
not an oversight.

## 4. Does T3 give T4/T5 what they need? — yes (✓)

- **T4 (parser/plan)**: `Migration`/`migration`, `asMigrationDir`+`migrationDirItems`,
  `asVersion`, `Plan`/`plan`, `SchemaMigrations`/`isApplied` — exactly the inputs/
  outputs `parseMigration`, `readMigrations`, and `planMigrations` compose over.
- **T5 (apply)**: `Migrator`, `Dialect.supportsTransactionalDdl` + per-migration
  `*Transaction` flags (the full wrap predicate), `AppliedVersion`, `isReversible`/
  `down: Option` for the `IrreversibleDown` short-circuit, `compareVersion` for
  ordering. Nothing missing.

## 5. The tsconfig switch (NodeNext → ESNext + Bundler) — sound and precedented (✓)

The diagnosis is correct: with `type:module`, `module:NodeNext` enforces ESM
semantics that **require explicit `.js` extensions** on relative/path-mapped
imports, which breaks the extensionless self-alias specifiers
(`plgg-db-migration/domain/model/…`). plgg-sql avoids this only because it has *no*
`type:module`. Switching to `module:ESNext` + `moduleResolution:Bundler` (keeping
`paths` + `erasableSyntaxOnly`) is exactly what **plgg-test** already does for the
same reason (verified — its tsconfig carries the identical setting and comment).
The two consumers it must satisfy both hold:
- **bin type-strip path**: unaffected — the runtime `hook.mjs` resolves
  `plgg-db-migration/<sub>` → `src/<sub>.ts` itself; tsconfig is compile-time only.
- **dual es+cjs+dts build**: the `.js` is produced by plgg-bundle's own import-graph
  walk (not tsc), and the `.d.ts` by `tsc -p tsconfig.build.json`.

## Concern + proposal (minor, forward-looking)

**C1 — confirm the shipped `dist/*.d.ts` resolves for an external consumer.**
The Bundler switch is correct for *this package's* compile and runtime, but it is
the one change with an externally-visible consequence: under `moduleResolution:
Bundler`, tsc emits **extensionless** relative imports into the `.d.ts`, and it is
plgg-bundle's `rewriteDtsAliases` (not tsc) that must leave the dist `.d.ts` tree
resolvable by a *consumer*. This is the same shape plgg-test already ships, so the
risk is low — but it is an assumption, not yet a verified fact for this package.
**Proposal**: at **T8** (example/consumption), add a one-time check that a consumer
`import`ing `plgg-db-migration` type-resolves cleanly (ideally under both a Bundler
and a NodeNext consumer tsconfig). Confirm once; don't assume.

**Micro-nit (optional, non-blocking).** `migration(fields: Migration): Migration =>
fields` is an identity function — unlike its siblings `plan`/`appliedVersion`/
`tenantDb`/`migrator`, which take positional args and assemble the object, it takes
an already-typed `Migration` and returns it. It documents a "named construction
point" but enforces no invariant a call-site literal wouldn't. Either give it the
positional-arg signature of its siblings for consistency, or accept it as a marker
— purely cosmetic.

## Decision

**Approve with minor suggestions.** The model is a faithful, idiomatic realization
of the canonical vocabulary — branded types on plgg primitives, `Option` down,
the txn flags, a `SqlError`-unifying `MigrationError`, and a pure `Plan`. The
`TenantShape` addition is coherent and the tsconfig switch is the correct,
plgg-test-precedented fix. C1 is a forward verification for T8, not a blocker;
nothing here needs re-review. T4 and T5 are unblocked.
