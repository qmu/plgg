import {
  Result,
  InvalidError,
  ok,
  err,
} from "plgg/index";

/**
 * Validates a value against a predicate function.
 */
export const refine =
  <T>(
    predicate: (arg: T) => boolean,
    errMessage?: string,
  ) =>
  (a: T): Result<T, InvalidError> =>
    predicate(a)
      ? ok(a)
      : err(
          new InvalidError({
            message: errMessage
              ? errMessage
              : `The value ${a} is not valid according to the predicate`,
          }),
        );
