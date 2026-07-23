import {
  type SoftStr,
  type PromisedResult,
  type Defect,
  proc,
  ok,
} from "plgg";
import {
  type Db,
  type SqlError,
} from "plgg-sql";
import {
  type MigrationError,
  migrator,
  migrateUp,
  asMigrationDir,
  sqlite,
} from "plgg-db-migration";
import { openDb } from "plgg-cms/content/vendors/openDb";
import { assetMigrations } from "plgg-cms/content/Media/usecase/assetMigrations";

/**
 * Opens the DB-PRIMARY asset store at `path` (its OWN
 * node:sqlite file — NEVER ticket 16's derived index; a
 * `rebuildIndex` must never touch it, D4) and brings it to the
 * latest schema by running the REVERSIBLE {@link assetMigrations}
 * through the migrator (up only; applied versions recorded, so
 * re-opening is idempotent). Never throws.
 */
export const openAssetStore = (
  path: SoftStr,
): PromisedResult<
  Db,
  MigrationError | SqlError | Defect
> => {
  const db = openDb(path);
  return proc(
    asMigrationDir(assetMigrations()),
    (dir) =>
      migrateUp(migrator(db, sqlite, dir)),
    () => ok(db),
  );
};
