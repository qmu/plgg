import {
  Result,
  InvalidError,
  invalidError,
  pipe,
  conclude,
  mapErr,
  fromNullable,
  matchOption,
  err,
} from "plgg";

/**
 * Maps raw, `unknown` driver rows into typed records, decoding each row with
 * the supplied `asRow` caster (built from plgg `cast`/`asObj`/`forProp`). A
 * shape mismatch becomes a value-level {@link InvalidError} — never a throw.
 *
 * Every row is attempted; the failures are gathered into the `sibling` array of
 * a single summarizing error, so one bad row does not hide the others.
 *
 * Data-last: `decodeRows(asUser)(rows)`.
 */
export const decodeRows =
  <T>(asRow: (row: unknown) => Result<T, InvalidError>) =>
  (
    rows: ReadonlyArray<unknown>,
  ): Result<ReadonlyArray<T>, InvalidError> =>
    pipe(
      rows,
      conclude(asRow),
      mapErr(
        (
          errors: ReadonlyArray<InvalidError>,
        ): InvalidError =>
          invalidError({
            message: `Failed to decode ${errors.length} of ${rows.length} row(s)`,
            sibling: errors,
          }),
      ),
    );

/**
 * Maps the *first* raw row into a typed record, for queries expected to return
 * one (a lookup by id, an `INSERT ... RETURNING`, etc.). An empty result set is
 * a value-level {@link InvalidError} rather than a silent `undefined`.
 *
 * Data-last: `decodeRow(asUser)(rows)`.
 */
export const decodeRow =
  <T>(asRow: (row: unknown) => Result<T, InvalidError>) =>
  (rows: ReadonlyArray<unknown>): Result<T, InvalidError> =>
    pipe(
      fromNullable(rows[0]),
      matchOption(
        () =>
          err(
            invalidError({
              message:
                "Expected a row, but the result set was empty",
            }),
          ),
        asRow,
      ),
    );

