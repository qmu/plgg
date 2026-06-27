import {
  Result,
  PromisedResult,
  SoftStr,
  ok,
  err,
} from "plgg";
import {
  Db,
  SqlError,
  toSqlError,
} from "plgg-sql/Db/model/Db";

/**
 * A pipeline step that runs a trusted, possibly multi-statement SQL *script*
 * through the {@link Db} seam's `execScript`, yielding `Ok<void>` on success.
 * Same shape as {@link query}/{@link exec} — config-first (`runScript(db)`),
 * data-last (`(text)`), errors as values — but for raw DDL/seed scripts the
 * developer authors (a migration body), not value-bound DML. The `text` is run
 * verbatim and bypasses the parameterized `Sql` box, so it must never carry
 * user input. A rejected driver call folds into a value-level {@link SqlError}.
 */
export const runScript =
  (db: Db) =>
  (text: SoftStr): PromisedResult<void, SqlError> =>
    db.execScript(text).then(
      (): Result<void, SqlError> => ok(undefined),
      (cause: unknown) => err(toSqlError(cause)),
    );
