import { Result, PromisedResult, err, isOk } from "plgg";
import {
  Db,
  SqlError,
  toSqlError,
} from "plgg-sql/Db/model/Db";

/**
 * Wraps a sub-pipeline in a database transaction. `work` is a data-last step
 * (`input → PromisedResult`) — typically a nested `proc` of `exec`/`query`
 * steps. The transaction is driven by the *result*, not by exceptions:
 *
 * - the inner pipeline yields `Ok` → **commit**;
 * - it yields `Err` (a validation, mapping, or SQL failure) → **roll back**;
 * - it throws/rejects → folded to a {@link SqlError} `Err` → **roll back**.
 *
 * Config-first (`transaction(db, work)`), data-last (`(input)`), so the whole
 * atomic unit is itself one step in an outer `proc`/`pipe` chain.
 */
export const transaction =
  <A, T, E extends Error>(
    db: Db,
    work: (input: A) => PromisedResult<T, E>,
  ) =>
  (input: A): PromisedResult<T, E | SqlError> =>
    db
      .begin()
      .then(() => work(input))
      .catch(
        (cause: unknown): Result<T, E | SqlError> =>
          err(toSqlError(cause)),
      )
      .then((result: Result<T, E | SqlError>) =>
        (isOk(result)
          ? db.commit()
          : db.rollback()
        ).then(() => result),
      );
