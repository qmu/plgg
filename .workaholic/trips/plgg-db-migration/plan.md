---
instruction: "to design plgg-db-migration, same developer experience as the one that can apply incremental query having both up/down in a single sqlfile, and schema_migrations in a table, supports major database, smaller better, and consider on demand by-tenant-db migration to sqlite"
phase: complete
step: complete/done
iteration: 0
updated_at: 2026-06-27T21:10:00+09:00
---

# Trip Plan

## Initial Idea

to design plgg-db-migration, same developer experience as the one that can apply incremental query having both up/down in a single sqlfile, and schema_migrations in a table, supports major database, smaller better, and consider on demand by-tenant-db migration to sqlite

## Plan Amendments

### 2026-06-27 — Consensus reached (round 1); design-v2 + rulings fixed

All three round-1 reviews Approve; no Request-revision, no escalation. The one
cross-artifact fracture (Direction's "migrate any database" vs Model/Design's
"SQLite-first") resolves to **SQLite-first phasing**, ratified by the Planner.
The plan is fixed; `designs/design-v2.md` folds in these agreed/ruled items:

1. **execScript seam** — required (not optional) additive `execScript(text)` on
   `plgg-sql`'s `Db` seam + a `runScript(db)(text)` step folding to `SqlError`;
   the `;`-splitter is dropped. Lives in **plgg-sql**; it is **ticket #1**, and
   every apply/rollback ticket `depends_on` it.
2. **Canonical domain vocabulary** (Architect's): `MigrationDir`,
   `AppliedVersion`, `SchemaMigrations`, `Plan`, `Migrator`, `TenantDb`/
   `TenantId`, `resolveTenantDb` seam, `down: Option<SoftStr>` (None =
   irreversible, fails loudly), and per-migration `upTransaction`/
   `downTransaction` flags. Dialect SQL is pure → **domain, not vendors**.
3. **SQLite-first phasing**: `node:sqlite` is the only out-of-box-runnable
   engine; PG/MySQL "supported" = dialect-correct bookkeeping + a documented
   **Db-adapter contract** (`?` placeholders / `$n` rewrite; `execScript`) + a
   **reference Postgres adapter shipped example-only**.
4. **Dry-run / plan-preview**: the pure `planMigrations` is exposed as a
   non-mutating `status` / `--dry-run` surface (CLI + programmatic).
5. **Per-tenant**: best-effort idempotency in v1 (keyed in-process mutex +
   SQLite `BEGIN IMMEDIATE` + in-lock re-check + version-PK; dialect-neutral —
   no driver-specific duplicate-key parsing); full cross-process distributed
   coordination deferred to v1+. v1 promise: "no corruption within or across
   processes; single-run coordination within a process." The concurrent
   cold-start race test is the explicit **proactive-PoC gate**; core tickets
   (1–6) deliver standalone value if the per-tenant path is reshaped.
6. **Risk B**: wrap predicate = `dialect.supportsTransactionalDdl &&
   migration.upTransaction`; MySQL partial-apply documented. **schema.sql dump**
   = explicit v1 **non-goal** (needs `pg_dump`/`sqlite3` → breaks zero-deps).

## Progress

- [x] Planning Step 1 (Planner): `directions/direction-v1.md` — business vision (dbmate-shaped DX, sovereign zero-dep, on-demand per-tenant SQLite differentiator, phased ROI, risks, recorded assumptions A1–A6).
- [x] Planning Step 5 (Constructor): `designs/design-v2.md` authored (folds in the consensus rulings above) and decomposed into 8 dependency-ordered tickets under `.workaholic/tickets/todo/a-qmu-jp/`. DESIGN-ONLY trip — stop after tickets; no implementation.
- [x] Coding concurrent-launch (Planner): dev env verified (Node v24.13.1 → `node:sqlite` available; `tsx` v4.22.4; examples run `npx tsx packages/<pkg>/example.ts`; build via `scripts/build.sh` which bootstraps plgg-bundle's own `typescript`; new pkg must join `build.sh`+`npm-install.sh` after plgg-sql, and plgg-sql must be REBUILT after T1's `execScript` before T5/T7/T8 E2E). Per-ticket E2E scenarios planned (T1 multi-statement script via seam; T5 up/down/`--to`/dry-run/idempotent/irreversible on a real sqlite file; T6 CLI end-to-end + non-zero exit on failure; T7 the PoC-gate concurrent cold-start race → exactly-once, incl. a 2-process variant for the `BEGIN IMMEDIATE` lock path; T8 runnable example + zero-driver-dep assertion). Coverage >90% is Constructor's internal gate; Planner verifies external behavior.
