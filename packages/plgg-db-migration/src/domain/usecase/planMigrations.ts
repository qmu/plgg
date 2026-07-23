import { versionString } from "plgg-db-migration/domain/model/Version";
import {
  MigrationDir,
  migrationDirItems,
} from "plgg-db-migration/domain/model/MigrationDir";
import { SchemaMigrations } from "plgg-db-migration/domain/model/SchemaMigrations";
import {
  Plan,
  plan,
} from "plgg-db-migration/domain/model/Plan";

/**
 * The pure diff between the on-disk {@link MigrationDir} and the database's
 * recorded {@link SchemaMigrations}: the ordered `pending` up-migrations not yet
 * applied, alongside the `applied` ledger rows. No I/O — this is the data the
 * `status` / `--dry-run` preview renders, and the set `migrateUp` folds over.
 */
export const planMigrations = (
  dir: MigrationDir,
  applied: SchemaMigrations,
): Plan => {
  const appliedVersions = new Set(
    applied.map((a) => versionString(a.version)),
  );
  return plan(
    migrationDirItems(dir).filter(
      (m) =>
        !appliedVersions.has(
          versionString(m.version),
        ),
    ),
    applied,
  );
};
