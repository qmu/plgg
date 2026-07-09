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
import { editingMigrations } from "plgg-cms/content/Editing/usecase/editingMigrations";

/**
 * Opens the DB-PRIMARY draft store at `path` (its OWN
 * node:sqlite file — NEVER ticket 16's derived index; a
 * `rebuildIndex` must never touch it, D4) and brings it to the
 * latest schema by running the REVERSIBLE
 * {@link editingMigrations} through the migrator (up only;
 * applied versions recorded, so re-opening is idempotent).
 * `openDb` enables `PRAGMA foreign_keys = ON`, so the
 * revision→draft cascade is live. Never throws.
 */
export const openDraftStore = (
  path: SoftStr,
): PromisedResult<
  Db,
  MigrationError | SqlError | Defect
> => {
  const db = openDb(path);
  return proc(
    asMigrationDir(editingMigrations()),
    (dir) =>
      migrateUp(migrator(db, sqlite, dir)),
    () => ok(db),
  );
};
