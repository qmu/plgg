import {
  Result,
  ok,
  err,
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
      >((acc, result) => (isOk(result) ? (isOk(acc) ? ok([...acc.content, result.content]) : acc) : isErr(acc) ? err([...acc.content, result.content]) : err([result.content])), ok([]));
