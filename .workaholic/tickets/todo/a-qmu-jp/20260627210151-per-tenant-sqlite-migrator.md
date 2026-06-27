---
created_at: 2026-06-27T21:01:51+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, DB]
effort:
commit_hash:
category:
depends_on: [20260627210149-schema-migrations-apply-rollback.md]
---

# Implement the on-demand per-tenant SQLite migrator

## Overview

The headline differentiator: bring a per-tenant SQLite database up to the current
schema version **lazily, on first access**. `migrateTenant` is thin orchestration
over the existing `ensureSchemaMigrations` / `planMigrations` / `applyMigration`
usecases (not a parallel implementation), plus a dialect-neutral concurrency
guard. *Where* a tenant's DB lives is an app concern, supplied behind a
`resolveTenantDb` seam, keeping the tool ignorant of tenant topology and testable
with an in-memory `:memory:` `Db`.

**v1 promise**: "no corruption within or across processes; single-run
coordination within a process." Full cross-process *distributed* coordination
(a lease/lock service across many Node instances) is deferred to v1+. The
**concurrent cold-start race test is the explicit proactive-PoC gate** for this
ticket — the genuinely novel surface is proven small before being relied on. The
core tickets (1–6) deliver standalone value if this path is later reshaped.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` —
  `migrateTenant` in `src/domain/usecase/`; the tenant resolver is a caller-
  supplied seam, not bundled topology.
- `workaholic:implementation` / `policies/coding-standards.md` — the keyed mutex
  uses a `Map<TenantId, Promise<...>>` (no `class`, no shared mutable escape
  hatch beyond a contained module accumulator); no `as`/`any`/`ts-ignore`;
  Prettier 50.
- `workaholic:implementation` / `policies/functional-programming.md` —
  `migrateTenant(config)(tenantId): PromisedResult<...>`; failures as values.
- `workaholic:implementation` / `policies/test.md` — the **concurrent
  cold-start race test is the PoC gate** (two simultaneous first-touch requests
  for one fresh tenant → exactly one applied run, no corruption); also test
  cold-start, already-migrated no-op, and the idempotent re-apply path;
  coverage > 90%.
- `workaholic:design` / `policies/per-tenant-database.md` — this is the automated
  per-tenant provisioning/migration path the policy requires for a
  database-per-tenant isolation model.
- `workaholic:operation` / `policies/ci-cd.md` — the lazy migration runs inside
  the running app at tenant-provision time; it must be idempotent and observable,
  and degrade safely under a deploy-time thundering herd.

## Trip Origin

`.workaholic/trips/plgg-db-migration/designs/design-v2.md` §2.5 (on-demand
per-tenant SQLite migrator: dialect-neutral idempotency, v1 promise, the
proactive-PoC gate) and §5 (the per-tenant cold-start race), with the
tenant-resolution seam from `models/model-v1.md` §4 (Boundary 4) and the layered
concurrency mitigation from `models/model-v1.md` Risk C.

## Key Files

- `packages/plgg-db-migration/src/domain/usecase/applyMigration.ts`,
  `ensureSchemaMigrations.ts`, `planMigrations.ts` - the usecases `migrateTenant`
  composes.
- `packages/plgg-sql/example.ts` - the `node:sqlite` `Db` seam (now with
  `execScript`); the per-tenant `Db` is opened the same way, with
  `busy_timeout`/WAL set at the seam.
- `packages/plgg-db-migration/src/domain/model/TenantDb.ts`, `TenantId.ts` -
  from the models ticket.

## Implementation Steps

1. Define the config seam: `{ resolveTenantDb: (id: TenantId) =>
   PromisedResult<TenantDb, MigrationError>; dir: MigrationDir; dialect: sqlite }`.
2. `migrateTenant(config)(tenantId)` — inside a per-`tenantId` critical section:
   resolve the `TenantDb` → `ensureSchemaMigrations` → `listApplied` →
   `planMigrations` → if `pending` non-empty, fold through `applyMigration`; else
   no-op.
3. **In-process guard**: a module-level `Map<TenantId, Promise<Result<...>>>` so
   concurrent calls for the same tenant await one run, then the entry is cleared.
4. **Within/across-process guard (dialect-neutral)**: each `applyMigration` opens
   its transaction with SQLite write-lock semantics (`BEGIN IMMEDIATE`) and
   re-reads applied versions inside the lock; the version PK makes a racing
   double-insert a loud, safe failure rather than corruption. The `pending`-empty
   check runs *inside* the critical section. Do **not** parse driver-specific
   duplicate-key error strings — rely on the PK + in-lock re-check.
5. Recommend `busy_timeout` / WAL on the tenant `Db` at the seam (documented; set
   by the app's `resolveTenantDb`).
6. Tests per Implementation Policy `test.md`; coverage > 90%.

## Considerations

- **Cross-process coordination across multiple Node instances** is out of v1
  scope beyond the SQLite-lock + idempotency guarantees; document it as an
  operational boundary, do not silently assume it away
  (`packages/plgg-db-migration/src/domain/usecase/migrateTenant.ts`).
- The keyed-mutex map must clear its entry after settlement (success or failure)
  so a later request can retry; a never-cleared entry would wedge a tenant
  (`packages/plgg-db-migration/src/domain/usecase/migrateTenant.ts`).
- Per-tenant SQLite is the only engine this path supports by design (it is the
  per-tenant isolation story); no dialect branching here.
