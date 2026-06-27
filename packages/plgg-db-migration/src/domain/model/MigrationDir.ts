import {
  Box,
  Result,
  ok,
  err,
  box,
} from "plgg";
import { Migration } from "plgg-db-migration/domain/model/Migration";
import {
  compareVersion,
  versionString,
} from "plgg-db-migration/domain/model/Version";
import {
  MigrationError,
  orderingViolation,
} from "plgg-db-migration/domain/model/MigrationError";

/**
 * An ordered, duplicate-free set of migrations read from a directory: a branded
 * `ReadonlyArray<Migration>` sorted ascending by {@link Version}. Branded so a
 * raw array can't masquerade as a validated, ordered directory — the only way
 * to obtain one is through {@link asMigrationDir}, which the planner relies on
 * for a clean, ordered input.
 */
export type MigrationDir = Box<
  "MigrationDir",
  ReadonlyArray<Migration>
>;

/**
 * Builds a {@link MigrationDir} from migrations in any order: sorts ascending by
 * version, and fails with an `OrderingViolation` {@link MigrationError} if two
 * share a version (a duplicate the planner could not order deterministically).
 */
export const asMigrationDir = (
  migrations: ReadonlyArray<Migration>,
): Result<MigrationDir, MigrationError> => {
  const versions = migrations.map((m) =>
    versionString(m.version),
  );
  return new Set(versions).size ===
    versions.length
    ? ok(
        box("MigrationDir")(
          [...migrations].sort((a, b) =>
            compareVersion(a.version, b.version),
          ),
        ),
      )
    : err(
        orderingViolation(
          "duplicate migration version in the migrations directory",
        ),
      );
};

/** The ordered migrations of a {@link MigrationDir}. */
export const migrationDirItems = (
  dir: MigrationDir,
): ReadonlyArray<Migration> => dir.content;
