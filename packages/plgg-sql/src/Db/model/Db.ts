import {
  SoftStr,
  Num,
  Option,
  fromNullable,
  foldThrown,
  defineVariant,
} from "plgg";
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
  /**
   * Run a trusted, possibly multi-statement SQL script.
   *
   * For developer-authored scripts only — schema migrations, seeds, fixtures —
   * whose `text` is executed verbatim and so **bypasses the parameterized
   * {@link Sql} box**: it must NEVER carry user input. `run` stays the path for
   * value-bound, single-statement DML; this is the path for raw DDL a prepared
   * statement cannot execute as one call (e.g. a migration body). Pair it with
   * the `runScript` step to fold a driver rejection into a {@link SqlError}.
   */
  execScript: (text: SoftStr) => Promise<void>;
  /** Begin a transaction. */
  begin: () => Promise<void>;
  /** Commit the current transaction. */
  commit: () => Promise<void>;
  /** Roll back the current transaction. */
  rollback: () => Promise<void>;
};

/**
 * A failure raised while executing SQL against the {@link Db}. Pure tagged data
 * (a `Box`, not an `Error` subclass) so it rides the `Result`/`proc` error
 * channel like any plgg error.
 */
const SqlErrorV = defineVariant("SqlError")<{
  message: SoftStr;
  cause: Option<unknown>;
}>();

export type SqlError = ReturnType<
  typeof SqlErrorV.make
>;

/**
 * Constructs a {@link SqlError}.
 */
export const sqlError = (
  message: SoftStr,
  cause?: unknown,
): SqlError =>
  SqlErrorV.make({
    message,
    cause: fromNullable(cause),
  });

/**
 * Pattern matcher for folding a {@link SqlError} with `match` by tag.
 */
export const sqlError$ = SqlErrorV.pattern;

/**
 * Lifts an unknown thrown cause into a {@link SqlError}, preserving the chain.
 */
export const toSqlError = (cause: unknown): SqlError =>
  foldThrown<SqlError>(
    (e) => sqlError(e.message, e),
    () => sqlError("SQL execution failed"),
  )(cause);
