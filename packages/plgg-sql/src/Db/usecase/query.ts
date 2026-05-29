import { Result, PromisedResult, ok, err } from "plgg";
import { Sql } from "plgg-sql/Sql/model/Sql";
import {
  Db,
  ExecResult,
  SqlError,
  toSqlError,
} from "plgg-sql/Db/model/Db";

/**
 * A pipeline step that runs a `SELECT` through the {@link Db} seam and yields
 * its raw rows as a `Result` — config-first (`query(db)`), data-last (`(sql)`),
 * so it drops straight into a `proc`/`pipe` chain. A rejected driver call folds
 * into a value-level {@link SqlError}; pair it with `decodeRow`/`decodeRows` to
 * type the rows.
 */
export const query =
  (db: Db) =>
  (
    sql: Sql,
  ): PromisedResult<ReadonlyArray<unknown>, SqlError> =>
    db.all(sql).then(
      (rows): Result<ReadonlyArray<unknown>, SqlError> =>
        ok(rows),
      (cause: unknown) => err(toSqlError(cause)),
    );

/**
 * A pipeline step that runs a DML statement (`INSERT`/`UPDATE`/`DELETE`) through
 * the {@link Db} seam, yielding its {@link ExecResult}. Same shape as
 * {@link query}: config-first, data-last, errors as values.
 */
export const exec =
  (db: Db) =>
  (sql: Sql): PromisedResult<ExecResult, SqlError> =>
    db.run(sql).then(
      (result): Result<ExecResult, SqlError> => ok(result),
      (cause: unknown) => err(toSqlError(cause)),
    );
