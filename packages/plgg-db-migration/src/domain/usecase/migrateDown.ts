import {
  Result,
  PromisedResult,
  Defect,
  ok,
  err,
  isOk,
  proc,
  pipe,
  fromNullable,
  matchOption,
  matchResult,
} from "plgg";
import { SqlError } from "plgg-sql";
import { Migration } from "plgg-db-migration/domain/model/Migration";
import {
  MigrationDir,
  migrationDirItems,
} from "plgg-db-migration/domain/model/MigrationDir";
import { Migrator } from "plgg-db-migration/domain/model/Migrator";
import {
  Version,
  versionString,
} from "plgg-db-migration/domain/model/Version";
import { SchemaMigrations } from "plgg-db-migration/domain/model/SchemaMigrations";
import {
  MigrationError,
  missingMigration,
} from "plgg-db-migration/domain/model/MigrationError";
import { ensureSchemaMigrations } from "plgg-db-migration/domain/usecase/ensureSchemaMigrations";
import { listApplied } from "plgg-db-migration/domain/usecase/listApplied";
import { rollbackMigration } from "plgg-db-migration/domain/usecase/applyMigration";

/**
 * The versions to roll back, in descending (newest-first) order: by default the
 * single most-recent applied version; with `to`, every applied version strictly
 * above `to`. `applied` arrives ascending from {@link listApplied}.
 */
const rollbackTargets = (
  applied: SchemaMigrations,
  to: Version | undefined,
): ReadonlyArray<Version> =>
  (to === undefined
    ? applied.slice(-1).map((a) => a.version)
    : applied
        .map((a) => a.version)
        .filter(
          (v) =>
            versionString(v) > versionString(to),
        )
  )
    .slice()
    .reverse();

/** Find the on-disk migration for an applied version, or fail loudly. */
const findMigration = (
  dir: MigrationDir,
  version: Version,
): Result<Migration, MigrationError> =>
  pipe(
    fromNullable(
      migrationDirItems(dir).find(
        (m) =>
          versionString(m.version) ===
          versionString(version),
      ),
    ),
    matchOption(
      (): Result<Migration, MigrationError> =>
        err(
          missingMigration(
            `no migration file for applied version ${versionString(version)}`,
          ),
        ),
      (m: Migration) => ok(m),
    ),
  );

/**
 * Roll back the target versions in order, stopping at the first failure. A
 * sequential fold over the array (not a fixed-arity `proc` chain).
 */
const rollbackEach = (
  migrator: Migrator,
  versions: ReadonlyArray<Version>,
): PromisedResult<
  ReadonlyArray<Version>,
  MigrationError | SqlError | Defect
> =>
  versions.reduce<
    PromisedResult<
      ReadonlyArray<Version>,
      MigrationError | SqlError | Defect
    >
  >(
    (accP, version) =>
      accP.then((acc) =>
        isOk(acc)
          ? matchResult(
              (
                e: MigrationError,
              ): PromisedResult<
                ReadonlyArray<Version>,
                MigrationError | SqlError | Defect
              > => Promise.resolve(err(e)),
              (m: Migration) =>
                rollbackMigration(migrator)(
                  m,
                ).then((r) =>
                  isOk(r)
                    ? ok([
                        ...acc.content,
                        version,
                      ])
                    : r,
                ),
            )(
              findMigration(
                migrator.dir,
                version,
              ),
            )
          : acc,
      ),
    Promise.resolve(ok([])),
  );

/**
 * Roll the database back: ensure the ledger, read what is applied, and roll back
 * the most-recent applied migration (default) or every applied migration above
 * `to`. Returns the versions rolled back this run (empty when nothing applied).
 */
export const migrateDown = (
  migrator: Migrator,
  to?: Version,
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
      rollbackEach(
        migrator,
        rollbackTargets(applied, to),
      ),
  );
