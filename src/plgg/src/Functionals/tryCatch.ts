import {
  Result,
  Procedural,
  newOk,
  newErr,
  isPromise,
} from "plgg/index";

/**
 * Wraps a function to catch exceptions and return Result.
 * Supports both sync and async functions via Procedural.
 */
// Overload for synchronous functions
function tryCatch<T, U, E = Error>(
  fn: (arg: T) => U,
  errorHandler?: (error: unknown) => E,
): (arg: T) => Result<U, E>;
// Overload for async functions
function tryCatch<T, U, E = Error>(
  fn: (arg: T) => Promise<U>,
  errorHandler?: (error: unknown) => E,
): (arg: T) => Promise<Result<U, E>>;
// Implementation
function tryCatch<T, U, E extends Error = Error>(
  fn: (arg: T) => Procedural<U, E>,
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
): (arg: T) => Procedural<Result<U, E>, E> {
  return (arg: T) => {
    try {
      const result = fn(arg);
      if (isPromise(result)) {
        return result.then(
          (value) => newOk(value as U),
          (error) => newErr(errorHandler(error)),
        );
      }
      return newOk(result as U);
    } catch (error: unknown) {
      return newErr(errorHandler(error));
    }
  };
}

export { tryCatch };
