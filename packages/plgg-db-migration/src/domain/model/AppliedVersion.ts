import { SoftStr } from "plgg";
import { Version } from "plgg-db-migration/domain/model/Version";

/**
 * One row of the `schema_migrations` ledger: a {@link Version} the database has
 * recorded as applied, with its `appliedAt` timestamp (kept as the raw `SoftStr`
 * the driver returns).
 */
export type AppliedVersion = Readonly<{
  version: Version;
  appliedAt: SoftStr;
}>;

/**
 * Constructs an {@link AppliedVersion} (the named construction point used when
 * decoding ledger rows).
 */
export const appliedVersion = (
  version: Version,
  appliedAt: SoftStr,
): AppliedVersion => ({ version, appliedAt });
