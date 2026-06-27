import { Bool } from "plgg";
import {
  Version,
  versionString,
} from "plgg-db-migration/domain/model/Version";
import { AppliedVersion } from "plgg-db-migration/domain/model/AppliedVersion";

/**
 * The projection of what the database believes it has run: the rows of the
 * `schema_migrations` ledger. The planner diffs this against the on-disk
 * {@link MigrationDir} to compute pending work.
 */
export type SchemaMigrations =
  ReadonlyArray<AppliedVersion>;

/**
 * Whether a given {@link Version} is recorded as applied in the ledger.
 */
export const isApplied = (
  schemaMigrations: SchemaMigrations,
  version: Version,
): Bool =>
  schemaMigrations.some(
    (applied) =>
      versionString(applied.version) ===
      versionString(version),
  );
