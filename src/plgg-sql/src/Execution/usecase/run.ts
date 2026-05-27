import {
  Result,
  PromisedResult,
  InvalidError,
  pipe,
} from "plgg";
import { Sql } from "plgg-sql/Sql/model/Sql";
import { decodeRows } from "plgg-sql/Mapping/usecase/decodeRows";

/**
 * The synchronous execution seam: runs parameterized {@link Sql} against a
 * database and returns the raw, `unknown` rows. The library ships no driver —
 * the caller supplies this (e.g. `node:sqlite`'s `prepare(text).all(...params)`).
 */
export type Executor = (
  sql: Sql,
) => ReadonlyArray<unknown>;

/**
 * The asynchronous execution seam, for drivers whose calls return a Promise.
 */
export type AsyncExecutor = (
  sql: Sql,
) => Promise<ReadonlyArray<unknown>>;

/**
 * Evaluates a query end to end (sync): execute it through the caller's
 * {@link Executor}, then decode the raw rows into typed records with `asRow`.
 * A shape mismatch surfaces as a value-level {@link InvalidError}.
 *
 * Data-last: `run(execute, asUser)(sql)`.
 */
export const run =
  <T>(
    execute: Executor,
    asRow: (row: unknown) => Result<T, InvalidError>,
  ) =>
  (
    sql: Sql,
  ): Result<ReadonlyArray<T>, InvalidError> =>
    pipe(sql, execute, decodeRows(asRow));

/**
 * Evaluates a query end to end (async): the {@link AsyncExecutor} runs the SQL,
 * then the resolved rows are decoded with `asRow`. Returns a {@link PromisedResult}.
 *
 * Data-last: `await runAsync(execute, asUser)(sql)`.
 */
export const runAsync =
  <T>(
    execute: AsyncExecutor,
    asRow: (row: unknown) => Result<T, InvalidError>,
  ) =>
  (
    sql: Sql,
  ): PromisedResult<ReadonlyArray<T>, InvalidError> =>
    execute(sql).then(decodeRows(asRow));
