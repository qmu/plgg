---
created_at: 2026-06-27T21:01:52+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, DB]
effort:
commit_hash:
category:
depends_on: [20260627210150-cli-and-new-migration.md, 20260627210151-per-tenant-sqlite-migrator.md]
---

# Add a runnable example, README, and the `Db`-adapter contract (SQLite-first; Postgres reference)

## Overview

Prove the whole tool end-to-end and document how to use it. A runnable
`example.ts` (mirroring `plgg-sql`'s) exercises the dbmate flow against a real
`node:sqlite` database — `new` → `up` → `status` → `down` — plus the on-demand
per-tenant path. The README documents the **`Db`-adapter contract** that makes
"supports major databases" honest: SQLite runs out of the box (zero deps,
`node:sqlite`); Postgres/MySQL are supported via an **app-supplied** `Db` adapter
meeting a stated contract, shown by a reference Postgres adapter that is
**example-only** (it requires the app's own `pg`, never a package dependency).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — `example.ts`
  + `README.md` at the package root, mirroring plgg-sql.
- `workaholic:implementation` / `policies/coding-standards.md` — docs/examples use
  the branded `Str`/`asStr`, not `SoftStr` (per the house preference); no
  `as`/`any`/`ts-ignore`; Prettier 50.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — the package
  itself ships no driver and no native binding; the reference Postgres adapter
  lives in example/docs and depends on the *app's* `pg`. Schema-dump
  (`pg_dump`/`sqlite3` shell-outs) is explicitly a non-goal for v1.
- `workaholic:implementation` / `policies/objective-documentation.md` — the
  README states the contract and limits factually (placeholder rewriting, MySQL
  non-transactional DDL, cross-process per-tenant boundary).
- `workaholic:implementation` / `policies/persistence.md` — the example places
  migrations in a `databases/<db>/migrations/` layout, demonstrating the
  schema-first slot.

## Trip Origin

`.workaholic/trips/plgg-db-migration/designs/design-v1.md` §4 step 7 (example +
README) and §5 (placeholder-mismatch risk; driver-scope-creep governance), as
resolved in `reviews/round-1-constructor.md` (SQLite-first phasing; document the
`Db`-adapter contract; reference Postgres adapter example-only; schema-dump out
of v1) — the agreed resolution of the one cross-artifact fracture vs
`directions/direction-v1.md`'s "migrate any database" headline.

## Key Files

- `packages/plgg-sql/example.ts`, `packages/plgg-sql/README.md` - precedent for a
  living, runnable example + README structure.
- `packages/plgg-db-migration/src/index.ts` - public API the example imports.
- `packages/plgg-db-migration/src/entrypoints/cli.ts` - the CLI the README
  documents.

## Implementation Steps

1. `example.ts` (`npx tsx`): open a `node:sqlite` `Db` (with `execScript`), point
   at a sample `databases/app/migrations/` dir with two migrations, run
   `migrateUp` → `status` → `migrateDown`, printing verifiable output; then
   demonstrate `migrateTenant` against two `:memory:` tenants including a
   concurrent first-touch.
2. README: the migration-file format (`-- migrate:up`/`-- migrate:down`),
   the CLI commands, the programmatic API, and the **`Db`-adapter contract** —
   the adapter must (a) accept `plgg-sql`'s `?` placeholders (rewriting to the
   engine's form, e.g. `$1` for Postgres) and (b) implement `execScript` for
   trusted scripts.
3. A reference Postgres `Db` adapter in the example/docs (over the app's `pg`),
   showing `?`→`$n` rewriting and `execScript` over a multi-statement query —
   clearly marked as example code, not a package dependency.
4. Document the v1 limits: MySQL non-transactional DDL (partial-apply recovery),
   per-tenant cross-process boundary, schema-dump as a non-goal.
5. `scripts/tsc-plgg.sh` / `scripts/test-plgg.sh` green; example runs clean.

## Considerations

- Keep the reference Postgres adapter out of `dependencies` — adding `pg` would
  violate zero-new-dep / no-native-binding; it is illustrative app code
  (`packages/plgg-db-migration/README.md`).
- Use `Str`/`asStr` in all docs/examples, not the verbose `SoftStr` primitive,
  per the house preference (`packages/plgg-db-migration/example.ts`).
- The example's migrations belong in a `databases/` layout, not inside the
  package, to model the real consumer placement
  (`packages/plgg-db-migration/example.ts`).
</content>
