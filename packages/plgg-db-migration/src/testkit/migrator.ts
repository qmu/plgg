import {
  Result,
  SoftStr,
  Option,
  ok,
  err,
  isOk,
  matchResult,
} from "plgg";
import { Db } from "plgg-sql";
import {
  Version,
  asVersion,
} from "plgg-db-migration/domain/model/Version";
import {
  Migration,
  migration,
} from "plgg-db-migration/domain/model/Migration";
import {
  MigrationDir,
  asMigrationDir,
} from "plgg-db-migration/domain/model/MigrationDir";
import { Dialect } from "plgg-db-migration/domain/model/Dialect";
import {
  Migrator,
  migrator,
} from "plgg-db-migration/domain/model/Migrator";
import { MigrationError } from "plgg-db-migration/domain/model/MigrationError";

/** A terse migration description for tests. */
export type MigrationSpec = {
  version: SoftStr;
  name: SoftStr;
  up: SoftStr;
  down: Option<SoftStr>;
};

/**
 * Test-only: build a {@link Migrator} from terse specs — validates each version,
 * builds the {@link MigrationDir}, and binds the db + dialect. Returns a `Result`
 * (no throw). Excluded from coverage / not in the public API.
 */
export const buildMigrator = (
  db: Db,
  dialect: Dialect,
  specs: ReadonlyArray<MigrationSpec>,
): Result<Migrator, MigrationError> =>
  matchResult(
    (
      e: MigrationError,
    ): Result<Migrator, MigrationError> => err(e),
    (migrations: ReadonlyArray<Migration>) =>
      matchResult(
        (
          e: MigrationError,
        ): Result<Migrator, MigrationError> =>
          err(e),
        (dir: MigrationDir) =>
          ok(migrator(db, dialect, dir)),
      )(asMigrationDir(migrations)),
  )(
    specs.reduce<
      Result<
        ReadonlyArray<Migration>,
        MigrationError
      >
    >(
      (acc, spec) =>
        isOk(acc)
          ? matchResult(
              (
                e: MigrationError,
              ): Result<
                ReadonlyArray<Migration>,
                MigrationError
              > => err(e),
              (version: Version) =>
                ok([
                  ...acc.content,
                  migration({
                    version,
                    name: spec.name,
                    up: spec.up,
                    down: spec.down,
                    upTransaction: true,
                    downTransaction: true,
                  }),
                ]),
            )(asVersion(spec.version))
          : acc,
      ok([]),
    ),
  );
