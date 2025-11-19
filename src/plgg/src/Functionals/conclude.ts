import {
  Result,
  newOk,
  newErr,
  isOk,
  isErr,
} from "plgg/index";

/**
 * Applies function to each element, collecting all results or errors.
 */
export const conclude =
  <T, U, F extends Error>(
    fn: (item: T) => Result<U, F>,
  ) =>
  (
    vec: ReadonlyArray<T>,
  ): Result<ReadonlyArray<U>, ReadonlyArray<F>> =>
    vec
      .map(fn)
      .reduce<
        Result<ReadonlyArray<U>, ReadonlyArray<F>>
      >((acc, result) => (isOk(result) ? (isOk(acc) ? newOk([...acc.content, result.content]) : acc) : isErr(acc) ? newErr([...acc.content, result.content]) : newErr([result.content])), newOk([]));
