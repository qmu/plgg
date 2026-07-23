import {
  Box,
  Ordering,
  comparing,
  refinedBrand,
  isSoftStr,
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

const version = refinedBrand<
  "Version",
  string,
  MigrationError
>(
  "Version",
  (v): v is string =>
    isSoftStr(v) && /^\d{14}$/.test(v),
  (v) =>
    versionShape(
      "a migration version must be a 14-digit YYYYMMDDHHMMSS timestamp",
      v,
    ),
);

/**
 * Type guard for {@link Version} (a `"Version"` box whose content qualifies).
 */
export const isVersion = version.is;

/**
 * Validates an unknown value into a {@link Version} at the filesystem boundary,
 * or fails with a `VersionShape` {@link MigrationError}.
 */
export const asVersion = version.as;

/** The underlying 14-digit string of a {@link Version}. */
export const versionString = version.unwrap;

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
