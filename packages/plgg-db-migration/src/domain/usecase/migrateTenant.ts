import {
  SoftStr,
  PromisedResult,
  Defect,
  ok,
  isOk,
  proc,
  pipe,
  fromNullable,
  matchOption,
} from "plgg";
import {
  Db,
  SqlError,
  runScript,
  exec,
} from "plgg-sql";
import { Version } from "plgg-db-migration/domain/model/Version";
import { Migration } from "plgg-db-migration/domain/model/Migration";
import { MigrationDir } from "plgg-db-migration/domain/model/MigrationDir";
import { Dialect } from "plgg-db-migration/domain/model/Dialect";
import {
  TenantId,
  tenantIdString,
} from "plgg-db-migration/domain/model/TenantId";
import { TenantDb } from "plgg-db-migration/domain/model/TenantDb";
import { MigrationError } from "plgg-db-migration/domain/model/MigrationError";
import { ensureSchemaMigrations } from "plgg-db-migration/domain/usecase/ensureSchemaMigrations";
import { listApplied } from "plgg-db-migration/domain/usecase/listApplied";
import { planMigrations } from "plgg-db-migration/domain/usecase/planMigrations";
import { insertVersionSql } from "plgg-db-migration/domain/usecase/dialectSql";

/**
 * The config for the on-demand per-tenant SQLite migrator. `resolveTenantDb` is
 * the app-supplied seam that locates (and opens, ideally with `busy_timeout` /
 * WAL) a tenant's SQLite `Db` — keeping the tool ignorant of tenant topology.
 * Per-tenant is SQLite-only by design (the isolation story); pass the `sqlite`
 * dialect.
 */
export type TenantMigrationConfig = Readonly<{
  resolveTenantDb: (
    id: TenantId,
  ) => PromisedResult<TenantDb, MigrationError>;
  dir: MigrationDir;
  dialect: Dialect;
}>;

type TenantResult = PromisedResult<
  ReadonlyArray<Version>,
  MigrationError | SqlError | Defect
>;

// In-process keyed mutex: concurrent requests for the same tenant await one run,
// so a cold-start burst migrates a fresh tenant exactly once (no double-apply).
// A contained module accumulator — the documented exception to immutable data;
// the entry is cleared after settlement so a later request can retry.
const inFlight = new Map<SoftStr, TenantResult>();

/** Apply the pending up-bodies + record their versions, inside the open lock. */
const applyEachLocked = (
  db: Db,
  pending: ReadonlyArray<Migration>,
): TenantResult =>
  pending.reduce<TenantResult>(
    (accP, m) =>
      accP.then((acc) =>
        isOk(acc)
          ? runScript(db)(m.up).then((upRes) =>
              isOk(upRes)
                ? exec(db)(
                    insertVersionSql(m.version),
                  ).then((insRes) =>
                    isOk(insRes)
                      ? ok([
                          ...acc.content,
                          m.version,
                        ])
                      : insRes,
                  )
                : upRes,
            )
          : acc,
      ),
    Promise.resolve(ok([])),
  );

/** Re-read applied (inside the write lock) and apply whatever is still pending. */
const applyPendingLocked = (
  config: TenantMigrationConfig,
  db: Db,
): TenantResult =>
  proc(
    listApplied(db),
    (applied) =>
      applyEachLocked(
        db,
        planMigrations(config.dir, applied)
          .pending,
      ),
  );

/**
 * Bring one tenant DB to head atomically: ensure the ledger, take a SQLite
 * write lock with `BEGIN IMMEDIATE` (so concurrent processes serialize here),
 * re-check applied *inside* the lock, apply the pending batch, and COMMIT — or
 * ROLLBACK on any failure. The whole batch is one transaction, so it does not
 * use the per-migration `applyMigration` wrap (which would nest a transaction).
 */
const migrateLocked = (
  config: TenantMigrationConfig,
  db: Db,
): TenantResult =>
  ensureSchemaMigrations(db, config.dialect).then(
    (ensured) =>
      isOk(ensured)
        ? runScript(db)("BEGIN IMMEDIATE").then(
            (begun) =>
              isOk(begun)
                ? applyPendingLocked(
                    config,
                    db,
                  ).then((applied) =>
                    isOk(applied)
                      ? runScript(db)(
                          "COMMIT",
                        ).then((committed) =>
                          isOk(committed)
                            ? applied
                            : committed,
                        )
                      : runScript(db)(
                          "ROLLBACK",
                        ).then(() => applied),
                  )
                : begun,
          )
        : ensured,
  );

/** Resolve the tenant DB, then migrate it under the lock. */
const runTenant = (
  config: TenantMigrationConfig,
  tenantId: TenantId,
): TenantResult =>
  proc(
    config.resolveTenantDb(tenantId),
    (resolved) =>
      migrateLocked(config, resolved.db),
  );

/** Start a run for a tenant, registering + clearing the keyed-mutex entry. */
const start = (
  config: TenantMigrationConfig,
  tenantId: TenantId,
): TenantResult => {
  const key = tenantIdString(tenantId);
  const run = runTenant(config, tenantId).finally(
    () => {
      inFlight.delete(key);
    },
  );
  inFlight.set(key, run);
  return run;
};

/**
 * On-demand per-tenant SQLite migrator: bring a tenant's database to head
 * lazily, on first access, exactly once under a concurrent cold-start (the
 * in-process keyed mutex coalesces concurrent requests; `BEGIN IMMEDIATE` + the
 * in-lock re-check serialize across processes). Returns the versions applied
 * this run (empty when already at head). Config-first / data-last.
 */
export const migrateTenant =
  (config: TenantMigrationConfig) =>
  (tenantId: TenantId): TenantResult =>
    pipe(
      fromNullable(
        inFlight.get(tenantIdString(tenantId)),
      ),
      matchOption(
        () => start(config, tenantId),
        (existing: TenantResult) => existing,
      ),
    );
