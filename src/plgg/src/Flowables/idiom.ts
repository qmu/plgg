import {
  Result,
  pipe,
  newOk,
  newErr,
  InvalidError,
  toError,
} from "plgg/index";

/**
 * Identity function that returns its argument unchanged.
 */
export const pass = <T>(x: T): T => x;

/**
 * Simple function composition utility.
 */
export const hold =
  <T, U>(fn: (x: T) => U) =>
  (x: T) =>
    fn(x);

/**
 * Debug utility that logs a value and returns it unchanged.
 */
export const debug = <T>(value: T): T => {
  console.debug(value);
  return value;
};

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
      ? newOk(a)
      : newErr(
          new InvalidError({
            message: errMessage
              ? errMessage
              : `The value ${a} is not valid according to the predicate`,
          }),
        );

/**
 * Wraps a function to catch exceptions and return Result.
 */
export const tryCatch =
  <T, U, E = Error>(
    fn: (arg: T) => U,
    errorHandler: (error: unknown) => E = (
      error: unknown,
    ) => {
      if (error instanceof Error) {
        return new Error(
          `Operation failed: ${error.message}`,
        ) as unknown as E;
      }
      return new Error(
        "Unexpected error occurred",
      ) as unknown as E;
    },
  ) =>
  (arg: T): Result<U, E> => {
    try {
      return newOk(fn(arg));
    } catch (error: unknown) {
      return newErr(errorHandler(error));
    }
  };

/**
 * Checks if a value is defined (not undefined).
 */
export const defined = <T>(
  value: T | undefined,
): Result<T, Error> =>
  value === undefined
    ? newErr(new Error("Value is undefined"))
    : newOk<T>(value);

/**
 * Encodes data as formatted JSON string.
 */
export const jsonEncode = (
  data: unknown,
): string => JSON.stringify(data, null, 2);

/**
 * Decodes JSON string or Buffer into unknown value, returning Result.
 */
export const jsonDecode = (
  json: string | Buffer,
): Result<unknown, Error> =>
  pipe(
    json,
    tryCatch(
      (json) =>
        JSON.parse(
          Buffer.isBuffer(json)
            ? json.toString("utf-8")
            : json,
        ),
      (error) => toError(error),
    ),
  );
