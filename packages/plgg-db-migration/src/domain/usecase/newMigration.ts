import {
  SoftStr,
  PromisedResult,
  err,
} from "plgg";
import {
  MigrationError,
  nameShape,
} from "plgg-db-migration/domain/model/MigrationError";
import {
  joinPath,
  writeFileText,
} from "plgg-db-migration/vendors/fs";

/** Zero-pad a number to a fixed width. */
const pad = (
  value: number,
  width: number,
): SoftStr => String(value).padStart(width, "0");

/**
 * Render a `Date` as a `YYYYMMDDHHMMSS` migration version (UTC, so a migration's
 * id is stable regardless of the author's timezone).
 */
export const formatTimestamp = (
  now: Date,
): SoftStr =>
  pad(now.getUTCFullYear(), 4) +
  pad(now.getUTCMonth() + 1, 2) +
  pad(now.getUTCDate(), 2) +
  pad(now.getUTCHours(), 2) +
  pad(now.getUTCMinutes(), 2) +
  pad(now.getUTCSeconds(), 2);

const SKELETON: SoftStr =
  "-- migrate:up\n\n\n-- migrate:down\n\n";

// A migration name becomes one filename segment joined onto `dir`, so it is
// held to the same safe charset as a path segment: no separators, dot segments,
// or NUL that a `join(dir, ...)` would let escape the migrations directory.
const NAME = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Scaffold a new migration file `<dir>/<YYYYMMDDHHMMSS>_<name>.sql` with the
 * dbmate up/down skeleton, returning its path. The clock is injected as `now`,
 * so the function is deterministic and testable; the CLI passes `new Date()`.
 *
 * An unsafe `name` (containing `/`, `\`, `.`/`..`, NUL, or other punctuation)
 * fails with a `NameShape` {@link MigrationError} and writes nothing, so the
 * scaffold can never land outside `dir`.
 */
export const newMigration = (
  dir: SoftStr,
  name: SoftStr,
  now: Date,
): PromisedResult<SoftStr, MigrationError> =>
  NAME.test(name)
    ? writeFileText(
        joinPath(
          dir,
          `${formatTimestamp(now)}_${name}.sql`,
        ),
        SKELETON,
      )
    : Promise.resolve(
        err(
          nameShape(
            "a migration name must be 1–64 characters of letters, digits, hyphen, or underscore",
            name,
          ),
        ),
      );
