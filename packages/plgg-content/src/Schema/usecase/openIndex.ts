import {
  type SoftStr,
  type PromisedResult,
  type Result,
  type InvalidError,
  type Defect,
  proc,
  ok,
} from "plgg";
import {
  type Db,
  type SqlError,
  sql,
  query,
  runScript,
} from "plgg-sql";
import { openDb } from "plgg-content/vendors/openDb";
import { contentSchemaDdl } from "plgg-content/Schema/usecase/contentSchema";

/**
 * Ensures the derived-index schema exists on `db`,
 * idempotently: the FTS5 virtual table cannot carry
 * `IF NOT EXISTS`, so a `sqlite_master` probe gates the
 * whole DDL — present ⇒ no-op, absent ⇒ create everything.
 * Recoverability (D4): a dropped DB → `initSchema` →
 * identical schema. Never throws.
 */
export const initSchema = (
  db: Db,
): PromisedResult<
  null,
  SqlError | InvalidError | Defect
> =>
  proc(
    query(db)(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${"chunks_fts"}`,
    ),
    (rows: ReadonlyArray<unknown>) =>
      rows.length > 0
        ? Promise.resolve(ok(null))
        : applyDdl(db),
  );

const applyDdl = (
  db: Db,
): PromisedResult<
  null,
  SqlError | InvalidError | Defect
> =>
  proc(
    db,
    (): Result<SoftStr, InvalidError> =>
      contentSchemaDdl(),
    (ddl: SoftStr) => runScript(db)(ddl),
    () => ok(null),
  );

/**
 * Opens a ready index at `path` (`":memory:"` for an
 * ephemeral one): the `node:sqlite` {@link openDb} seam plus
 * {@link initSchema}. Returns the driver-agnostic {@link Db}
 * every query/ingest usecase takes.
 */
export const openIndex = (
  path: SoftStr,
): PromisedResult<Db, SqlError | InvalidError | Defect> => {
  const db = openDb(path);
  return proc(initSchema(db), () => ok(db));
};
