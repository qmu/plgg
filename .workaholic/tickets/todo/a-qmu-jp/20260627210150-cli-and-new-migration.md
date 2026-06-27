---
created_at: 2026-06-27T21:01:50+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, DB]
effort:
commit_hash:
category:
depends_on: [20260627210149-schema-migrations-apply-rollback.md]
---

# Implement the CLI (`new`/`up`/`down`/`status` + `--dry-run`) and `newMigration` scaffold

## Overview

Expose the dbmate-shaped command surface. The programmatic API **is** the domain
layer (`migrateUp`/`migrateDown`/`status`/`newMigration`), config-first/data-last
so it drops into a caller's `proc` chain. The CLI is a thin shell over it — the
single place `throw`/`process.exit` lives (the framework edge), turning a
`Result` into an exit code, modeled on `plgg-bundle`'s CLI. A `--dry-run` flag on
`up`/`down` (and `status`) prints the `planMigrations` preview without applying —
the destructive-op-trust mitigation and the AI-agent-operator surface.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — the CLI in
  `src/entrypoints/cli.ts`; `newMigration` usecase in `src/domain/usecase/`.
- `workaholic:implementation` / `policies/coding-standards.md` — `throw` confined
  to the CLI edge; domain stays `Result`-based; no `as`/`any`/`ts-ignore`;
  Prettier 50.
- `workaholic:implementation` / `policies/functional-programming.md` — commands
  are `proc` chains over the domain usecases; failures are values until the CLI
  edge.
- `workaholic:operation` / `policies/ci-cd.md` — `up` is idempotent and
  CI-runnable; the CLI returns proper non-zero exit codes so a deploy pipeline
  can gate on it; `status` / `--dry-run` make state machine-readable for an
  AI/ops operator (observable, idempotent, previewable).

## Trip Origin

`.workaholic/trips/plgg-db-migration/designs/design-v2.md` §2.4 (CLI /
programmatic API + dry-run / plan-preview) and §4 ticket 5, with the thin-shell
exit-code pattern from `models/model-v1.md` §3 (dbmate `new`/`up`/`down`/`status`
fidelity).

## Key Files

- `packages/plgg-bundle/src/entrypoints/cli.ts`,
  `packages/plgg-bundle/bin/plgg-bundle.mjs` - precedent: thin `main`,
  dynamic-import of a `.ts` config, `Result`/throw → `process.exitCode`.
- `packages/plgg-db-migration/src/domain/usecase/` - `migrateUp`/`migrateDown`/
  `status` from the apply ticket; `vendors/fs.ts` write for the scaffold.

## Implementation Steps

1. `newMigration(dir, name): PromisedResult<SoftStr, MigrationError>` — write
   `<dir>/<YYYYMMDDHHMMSS>_<name>.sql` pre-filled with the `-- migrate:up` /
   `-- migrate:down` skeleton; return the path.
2. `entrypoints/cli.ts` — dispatch on `process.argv[2]`:
   - `new <name>` → `newMigration`;
   - `up [--dry-run]` → `ensureSchemaMigrations` then `migrateUp`; `--dry-run`
     prints the `planMigrations` pending list and applies nothing;
   - `down [--to <version>] [--dry-run]` → `migrateDown`; `--dry-run` previews
     what would roll back;
   - `status` → render `planMigrations` (non-mutating).
   The `Db` + `Dialect` + migrations dir come from a small project config the CLI
   dynamic-imports (the `plgg-bundle` `bundle.config.ts` pattern), keeping the
   package driver-free.
3. Turn a domain `Err` into `process.stderr` + non-zero `process.exitCode`; an
   `Ok` prints a concise summary line.
4. Tests for `newMigration` (file contents/path) and the dispatch mapping;
   coverage > 90% (the thin CLI shell may be index-excluded per the test config).

## Considerations

- The CLI must not embed a driver — the project config supplies the `Db`
  (`packages/plgg-db-migration/src/entrypoints/cli.ts`); this is the same
  separation `plgg-bundle` uses for `bundle.config.ts`.
- Keep commands idempotent and their output parseable so an AI agent operator
  (per the direction's Persona C) can run and interpret them; `--dry-run` lets an
  operator preview a destructive `down` before running it
  (`packages/plgg-db-migration/src/entrypoints/cli.ts`).
