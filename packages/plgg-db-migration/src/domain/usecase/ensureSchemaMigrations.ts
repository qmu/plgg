import { PromisedResult } from "plgg";
import {
  Db,
  SqlError,
  runScript,
} from "plgg-sql";
import { Dialect } from "plgg-db-migration/domain/model/Dialect";
import { schemaMigrationsDdl } from "plgg-db-migration/domain/usecase/dialectSql";

/**
 * Create the `schema_migrations` ledger if it does not exist (the dialect's
 * `CREATE TABLE IF NOT EXISTS`, run as a trusted script). Idempotent — safe to
 * call before every up/down/status.
 */
export const ensureSchemaMigrations = (
  db: Db,
  dialect: Dialect,
): PromisedResult<void, SqlError> =>
  runScript(db)(schemaMigrationsDdl(dialect));
