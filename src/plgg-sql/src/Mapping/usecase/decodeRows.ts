import {
  Result,
  InvalidError,
  pipe,
  conclude,
  mapErr,
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
          new InvalidError({
            message: `Failed to decode ${errors.length} of ${rows.length} row(s)`,
            sibling: errors,
          }),
      ),
    );
