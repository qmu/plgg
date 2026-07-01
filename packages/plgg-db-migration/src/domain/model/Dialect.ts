import { Bool } from "plgg";

/**
 * The SQL engines the tool can emit dialect-correct bookkeeping for. A closed
 * literal union so a fold over it (the dialect SQL builders) is exhaustive — a
 * fourth engine is a compile error until every site is updated.
 */
export type DialectName =
  | "sqlite"
  | "postgres"
  | "mysql";

/**
 * The dialect selected alongside the `Db`: its `name` (which drives the
 * `schema_migrations` DDL and the version insert/delete the tool authors) and
 * whether the engine supports transactional DDL (so a failed migration can roll
 * back atomically). The per-engine SQL itself is built in the apply ticket; this
 * model carries only the declarative selectors.
 */
export type Dialect = Readonly<{
  name: DialectName;
  supportsTransactionalDdl: Bool;
}>;

/** SQLite: built into Node via `node:sqlite`; DDL is transactional. */
export const sqlite: Dialect = {
  name: "sqlite",
  supportsTransactionalDdl: true,
};

/** PostgreSQL: DDL is transactional (a failed migration rolls back). */
export const postgres: Dialect = {
  name: "postgres",
  supportsTransactionalDdl: true,
};

/** MySQL: DDL implicitly commits, so migrations cannot be wrapped atomically. */
export const mysql: Dialect = {
  name: "mysql",
  supportsTransactionalDdl: false,
};
