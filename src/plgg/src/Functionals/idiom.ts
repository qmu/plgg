import {
  Result,
  InvalidError,
  Procedural,
  pipe,
  newOk,
  newErr,
  toError,
  isPromise,
  isOk,
  isErr,
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

/**
 * Accesses a property from an object in a proc-friendly way.
 * Returns Ok with the property value or Err if the property doesn't exist.
 */
export const atProp =
  <K extends string>(key: K) =>
  (
    obj: unknown,
  ): Result<unknown, InvalidError> => {
    if (
      typeof obj !== "object" ||
      obj === null ||
      !(key in obj)
    ) {
      return newErr(
        new InvalidError({
          message: `Cannot access property '${key}'`,
        }),
      );
    }
    return newOk(
      (obj as Record<string, unknown>)[key],
    );
  };

/**
 * Accesses an element from an array at a specific index in a proc-friendly way.
 * Returns Ok with the element at the index or Err if the index is out of bounds.
 */
export const atIndex =
  (index: number) =>
  (
    arr: unknown,
  ): Result<unknown, InvalidError> => {
    if (
      !Array.isArray(arr) ||
      index < 0 ||
      index >= arr.length
    ) {
      return newErr(
        new InvalidError({
          message: `Cannot access index ${index}`,
        }),
      );
    }
    return newOk(arr[index]);
  };

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
