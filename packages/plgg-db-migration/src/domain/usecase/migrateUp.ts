import {
  PromisedResult,
  Defect,
  ok,
  isOk,
  proc,
} from "plgg";
import { SqlError } from "plgg-sql";
import { Migration } from "plgg-db-migration/domain/model/Migration";
import { Migrator } from "plgg-db-migration/domain/model/Migrator";
import { Version } from "plgg-db-migration/domain/model/Version";
import { MigrationError } from "plgg-db-migration/domain/model/MigrationError";
import { ensureSchemaMigrations } from "plgg-db-migration/domain/usecase/ensureSchemaMigrations";
import { listApplied } from "plgg-db-migration/domain/usecase/listApplied";
import { planMigrations } from "plgg-db-migration/domain/usecase/planMigrations";
import { applyMigration } from "plgg-db-migration/domain/usecase/applyMigration";

/**
 * Apply the pending migrations in order, stopping at the first failure. A
 * sequential fold over the array (not a fixed-arity `proc` chain): each step
 * appends its version, `Err` short-circuits the rest.
 */
const applyPending = (
  migrator: Migrator,
  pending: ReadonlyArray<Migration>,
): PromisedResult<
  ReadonlyArray<Version>,
  MigrationError | SqlError | Defect
> =>
  pending.reduce<
    PromisedResult<
      ReadonlyArray<Version>,
      MigrationError | SqlError | Defect
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
  MigrationError | SqlError | Defect
> =>
  proc(
    ensureSchemaMigrations(
      migrator.db,
      migrator.dialect,
    ),
    () => listApplied(migrator.db),
    (applied) =>
      applyPending(
        migrator,
        planMigrations(migrator.dir, applied)
          .pending,
      ),
  );
