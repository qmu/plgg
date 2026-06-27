import { SoftStr, PromisedResult } from "plgg";
import { MigrationError } from "plgg-db-migration/domain/model/MigrationError";
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

/**
 * Scaffold a new migration file `<dir>/<YYYYMMDDHHMMSS>_<name>.sql` with the
 * dbmate up/down skeleton, returning its path. The clock is injected as `now`,
 * so the function is deterministic and testable; the CLI passes `new Date()`.
 */
export const newMigration = (
  dir: SoftStr,
  name: SoftStr,
  now: Date,
): PromisedResult<SoftStr, MigrationError> =>
  writeFileText(
    joinPath(
      dir,
      `${formatTimestamp(now)}_${name}.sql`,
    ),
    SKELETON,
  );
