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
import { stakeholderMigrations } from "plgg-cms/content/Stakeholder/usecase/stakeholderMigrations";

/**
 * Opens the DB-PRIMARY stakeholder store at `path` (its OWN
 * node:sqlite file — NEVER ticket 16's derived index; a
 * `rebuildIndex` must never touch it, D4) and brings it to the
 * latest schema by running the REVERSIBLE
 * {@link stakeholderMigrations} through the migrator (up only;
 * applied versions are recorded, so re-opening is idempotent
 * and never re-creates or drops a table). `openDb` enables
 * `PRAGMA foreign_keys = ON`, so the message→conversation
 * cascade is live. Returns a ready `Db`; never throws.
 */
export const openStakeholderStore = (
  path: SoftStr,
): PromisedResult<
  Db,
  MigrationError | SqlError | Defect
> => {
  const db = openDb(path);
  return proc(
    asMigrationDir(stakeholderMigrations()),
    (dir) =>
      migrateUp(migrator(db, sqlite, dir)),
    () => ok(db),
  );
};
