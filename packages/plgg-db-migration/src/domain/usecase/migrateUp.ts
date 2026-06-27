import { PromisedResult, ok, isOk } from "plgg";
import { SqlError } from "plgg-sql";
import { Migration } from "plgg-db-migration/domain/model/Migration";
import { Migrator } from "plgg-db-migration/domain/model/Migrator";
import { Version } from "plgg-db-migration/domain/model/Version";
import { MigrationError } from "plgg-db-migration/domain/model/MigrationError";
import { ensureSchemaMigrations } from "plgg-db-migration/domain/usecase/ensureSchemaMigrations";
import { listApplied } from "plgg-db-migration/domain/usecase/listApplied";
import { planMigrations } from "plgg-db-migration/domain/usecase/planMigrations";
import { applyMigration } from "plgg-db-migration/domain/usecase/applyMigration";

/** Apply the pending migrations in order, stopping at the first failure. */
const applyPending = (
  migrator: Migrator,
  pending: ReadonlyArray<Migration>,
): PromisedResult<
  ReadonlyArray<Version>,
  MigrationError | SqlError
> =>
  pending.reduce<
    PromisedResult<
      ReadonlyArray<Version>,
      MigrationError | SqlError
    >
  >(
    (accP, m) =>
      accP.then((acc) =>
        isOk(acc)
          ? applyMigration(migrator)(m).then(
              (r) =>
                isOk(r)
                  ? ok([
                      ...acc.content,
                      m.version,
                    ])
                  : r,
            )
          : acc,
      ),
    Promise.resolve(ok([])),
  );

/**
 * Bring the database up to head: ensure the ledger, read what is applied, plan
 * the pending set, and apply it in order. Returns the versions applied this run
 * (empty when already at head).
 */
export const migrateUp = (
  migrator: Migrator,
): PromisedResult<
  ReadonlyArray<Version>,
  MigrationError | SqlError
> =>
  ensureSchemaMigrations(
    migrator.db,
    migrator.dialect,
  ).then((ensured) =>
    isOk(ensured)
      ? listApplied(migrator.db).then(
          (appliedRes) =>
            isOk(appliedRes)
              ? applyPending(
                  migrator,
                  planMigrations(
                    migrator.dir,
                    appliedRes.content,
                  ).pending,
                )
              : appliedRes,
        )
      : ensured,
  );
