import { SoftStr } from "plgg";
import { Sql, sql } from "plgg-sql";
import {
  Version,
  versionString,
} from "plgg-db-migration/domain/model/Version";
import {
  Dialect,
  DialectName,
} from "plgg-db-migration/domain/model/Dialect";

/**
 * The one piece of SQL the tool authors itself that differs per engine: the
 * `schema_migrations` ledger's `CREATE TABLE`. Keyed by the closed
 * {@link DialectName} as a `Record`, so adding a fourth engine is a compile
 * error until its DDL is supplied. SQLite is the fully-runnable default; the
 * Postgres/MySQL forms are exercised via an app-supplied `Db` (the example).
 */
const SCHEMA_MIGRATIONS_DDL: Record<
  DialectName,
  SoftStr
> = {
  sqlite:
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));",
  postgres:
    "CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(14) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());",
  mysql:
    "CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(14) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);",
};

/** The `CREATE TABLE IF NOT EXISTS schema_migrations` for a dialect. */
export const schemaMigrationsDdl = (
  dialect: Dialect,
): SoftStr => SCHEMA_MIGRATIONS_DDL[dialect.name];

/**
 * The version insert/delete and the applied-versions select. These are
 * dialect-neutral: they use `plgg-sql`'s `?` placeholders (the app-supplied
 * `Db` adapter rewrites them to the engine's form, e.g. `$1` for Postgres), and
 * the `applied_at` column defaults are baked into the DDL above.
 */
export const insertVersionSql = (
  version: Version,
): Sql =>
  sql`INSERT INTO schema_migrations (version) VALUES (${versionString(version)})`;

/** Delete a version row from the ledger (used on rollback). */
export const deleteVersionSql = (
  version: Version,
): Sql =>
  sql`DELETE FROM schema_migrations WHERE version = ${versionString(version)}`;

/** Select all applied versions, ascending. */
export const selectAppliedSql = (): Sql =>
  sql`SELECT version, applied_at FROM schema_migrations ORDER BY version`;
