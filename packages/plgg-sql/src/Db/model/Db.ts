import { BaseError, Num, Option } from "plgg";
import { Sql } from "plgg-sql/Sql/model/Sql";

/**
 * The outcome of a DML statement (`INSERT`/`UPDATE`/`DELETE`): how many rows
 * changed, and the id of an inserted row when there is one (`None` otherwise).
 */
export type ExecResult = {
  changes: Num;
  lastInsertId: Option<Num>;
};

/**
 * The database seam — the small set of capabilities plgg-sql needs from *any*
 * driver. The library never imports a driver; an application supplies a `Db`
 * (the example wires one over `node:sqlite`). All calls are async so the same
 * code serves sync and async drivers alike.
 */
export type Db = {
  /** Run a query and return its raw rows. */
  all: (sql: Sql) => Promise<ReadonlyArray<unknown>>;
  /** Run a DML statement and return its {@link ExecResult}. */
  run: (sql: Sql) => Promise<ExecResult>;
  /** Begin a transaction. */
  begin: () => Promise<void>;
  /** Commit the current transaction. */
  commit: () => Promise<void>;
  /** Roll back the current transaction. */
  rollback: () => Promise<void>;
};

/**
 * A failure raised while executing SQL against the {@link Db}. Extends plgg's
 * `BaseError` so it rides the `Result`/`proc` error channel like any plgg error.
 */
export class SqlError extends BaseError {
  public name = "SqlError";
}

/**
 * Lifts an unknown thrown cause into a {@link SqlError}, preserving the chain.
 */
export const toSqlError = (cause: unknown): SqlError =>
  cause instanceof Error
    ? new SqlError(cause.message, cause)
    : new SqlError("SQL execution failed");
