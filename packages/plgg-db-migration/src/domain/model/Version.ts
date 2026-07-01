import {
  Box,
  SoftStr,
  Result,
  Ordering,
  ok,
  err,
  box,
  isBoxWithTag,
  isSoftStr,
  comparing,
} from "plgg";
import {
  MigrationError,
  versionShape,
} from "plgg-db-migration/domain/model/MigrationError";

/**
 * A branded migration version: the `YYYYMMDDHHMMSS` timestamp prefix of a
 * migration filename. Branded (not a bare `SoftStr`) so a raw string can never
 * be mistaken for a validated version, and so lexical ordering of the 14-digit
 * string is a total order that matches chronological order.
 */
export type Version = Box<"Version", string>;

/** A value qualifies as a version iff it is a 14-digit timestamp string. */
const qualify = (
  value: unknown,
): value is string =>
  isSoftStr(value) && /^\d{14}$/.test(value);

/**
 * Type guard for {@link Version} (a `"Version"` box whose content qualifies).
 */
export const isVersion = (
  value: unknown,
): value is Version =>
  isBoxWithTag("Version")(value) &&
  qualify(value.content);

/**
 * Validates an unknown value into a {@link Version} at the filesystem boundary,
 * or fails with a `VersionShape` {@link MigrationError}.
 */
export const asVersion = (
  value: unknown,
): Result<Version, MigrationError> =>
  isVersion(value)
    ? ok(value)
    : qualify(value)
      ? ok(box("Version")(value))
      : err(
          versionShape(
            "a migration version must be a 14-digit YYYYMMDDHHMMSS timestamp",
            value,
          ),
        );

/** The underlying 14-digit string of a {@link Version}. */
export const versionString = (
  version: Version,
): SoftStr => version.content;

/**
 * Total ordering over {@link Version} (ascending, chronological). Suitable as
 * an `Array.sort` comparator.
 */
export const compareVersion = (
  a: Version,
  b: Version,
): Ordering =>
  comparing<Version, string>(
    (v) => v.content,
  )(a, b);
