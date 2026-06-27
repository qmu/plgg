import {
  SoftStr,
  Result,
  PromisedResult,
  ok,
  err,
  pipe,
  fromNullable,
  getOr,
  matchResult,
} from "plgg";
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
import { MigrationError } from "plgg-db-migration/domain/model/MigrationError";
import {
  ParsedMigration,
  parseMigration,
} from "plgg-db-migration/domain/usecase/parseMigration";
import {
  joinPath,
  listDir,
  readFileText,
} from "plgg-db-migration/vendors/fs";

const SQL_FILE = /\.sql$/;

/** Fold an array of `Result`s into a `Result` of an array (fail-fast). */
const sequenceResults = <T, E>(
  results: ReadonlyArray<Result<T, E>>,
): Result<ReadonlyArray<T>, E> =>
  results.reduce<Result<ReadonlyArray<T>, E>>(
    (acc, current) =>
      matchResult(
        (e: E): Result<ReadonlyArray<T>, E> =>
          err(e),
        (list: ReadonlyArray<T>) =>
          matchResult(
            (
              e: E,
            ): Result<ReadonlyArray<T>, E> =>
              err(e),
            (value: T) => ok([...list, value]),
          )(current),
      )(acc),
    ok([]),
  );

/** The version prefix of a migration filename (before the first `_`). */
const versionPrefix = (
  filename: SoftStr,
): SoftStr =>
  pipe(
    fromNullable(
      filename
        .replace(SQL_FILE, "")
        .split("_")[0],
    ),
    getOr(""),
  );

/** The human name of a migration filename (after the first `_`). */
const migrationName = (
  filename: SoftStr,
): SoftStr =>
  filename
    .replace(SQL_FILE, "")
    .split("_")
    .slice(1)
    .join("_");

/** Combine a filename and its text into a validated {@link Migration}. */
const toMigration = (
  filename: SoftStr,
  text: SoftStr,
): Result<Migration, MigrationError> =>
  matchResult(
    (
      e: MigrationError,
    ): Result<Migration, MigrationError> =>
      err(e),
    (version: Version) =>
      matchResult(
        (
          e: MigrationError,
        ): Result<Migration, MigrationError> =>
          err(e),
        (parts: ParsedMigration) =>
          ok(
            migration({
              version,
              name: migrationName(filename),
              up: parts.up,
              down: parts.down,
              upTransaction: parts.upTransaction,
              downTransaction:
                parts.downTransaction,
            }),
          ),
      )(parseMigration(text)),
  )(asVersion(versionPrefix(filename)));

/** Read + parse every `.sql` file in `dir`, then build the ordered dir. */
const readAll = (
  dir: SoftStr,
  files: ReadonlyArray<SoftStr>,
): PromisedResult<MigrationDir, MigrationError> =>
  Promise.all(
    files.map((file) =>
      readFileText(joinPath(dir, file)).then(
        (read) =>
          matchResult(
            (
              e: MigrationError,
            ): Result<
              Migration,
              MigrationError
            > => err(e),
            (text: SoftStr) =>
              toMigration(file, text),
          )(read),
      ),
    ),
  ).then((results) =>
    matchResult(
      (
        e: MigrationError,
      ): Result<MigrationDir, MigrationError> =>
        err(e),
      (migrations: ReadonlyArray<Migration>) =>
        asMigrationDir(migrations),
    )(sequenceResults(results)),
  );

/**
 * Read a migrations directory into an ordered, duplicate-free
 * {@link MigrationDir}: list the directory, keep the `.sql` files, read + parse
 * each, and build the dir. The only I/O is the `vendors/fs` seam; parsing and
 * ordering stay pure. Errors fold to {@link MigrationError} (no `proc`, so the
 * channel is exactly `MigrationError`, not `… | Defect`).
 */
export const readMigrations = (
  dir: SoftStr,
): PromisedResult<MigrationDir, MigrationError> =>
  listDir(dir).then((listed) =>
    matchResult(
      (
        e: MigrationError,
      ): PromisedResult<
        MigrationDir,
        MigrationError
      > => Promise.resolve(err(e)),
      (entries: ReadonlyArray<SoftStr>) =>
        readAll(
          dir,
          entries.filter((entry) =>
            SQL_FILE.test(entry),
          ),
        ),
    )(listed),
  );
