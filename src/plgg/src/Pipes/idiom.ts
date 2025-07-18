import { isOk, Result, pipe, ok, err, ValidationError } from "plgg/index";

/**
 * Maps Result success value with function, leaving errors unchanged.
 */
export const mapOk =
  <T, U, F = Error>(fn: (value: T) => Result<U, F>) =>
  (result: Result<T, F>): Result<U, F> =>
    isOk(result) ? fn(result.ok) : result;

/**
 * Maps Result error value with function, leaving success values unchanged.
 */
export const mapErr =
  <T, U, F = Error>(fn: (error: F) => Result<T, U>) =>
  (result: Result<T, F>): Result<T, U> =>
    isOk(result) ? result : fn(result.err);

/**
 * Pattern matches on a Result, applying the appropriate function based on the variant.
 * This enables handling both success and error cases in a type-safe way.
 */
export const mapResult =
  <T, U, F = Error>(
    onOk: (value: T) => Result<U, F>,
    onErr: (error: F) => Result<U, F>,
  ) =>
  (result: Result<T, F>): Result<U, F> =>
    isOk(result) ? onOk(result.ok) : onErr(result.err);

/**
 * Simple function composition utility.
 * Applies a function to a value - useful for pipeline operations.
 */
export const bind =
  <T, U>(fn: (x: T) => U) =>
  (x: T) =>
    fn(x);

/**
 * Debug utility that logs a value and returns it unchanged.
 * Useful for debugging values in pipeline operations.
 */
export const debug = <T>(value: T): T => {
  console.debug(value);
  return value;
};

/**
 * Validates a value against a predicate function.
 * Returns Ok if predicate passes, Err with ValidationError if it fails.
 */
export const refine =
  <T>(predicate: (arg: T) => boolean, errMessage?: string) =>
  (a: T): Result<T, ValidationError> =>
    predicate(a)
      ? ok(a)
      : err(
          new ValidationError({
            message: errMessage
              ? errMessage
              : `The value ${a} is not valid according to the predicate`,
          }),
        );

/**
 * Converts unknown error to Error instance.
 */
export const toError = (err: unknown): Error =>
  err instanceof Error ? err : new Error(String(err));

/**
 * Wraps a function to catch exceptions and return Result.
 */
export const tryCatch =
  <T, U, E = Error>(
    fn: (arg: T) => U,
    errorHandler: (error: unknown) => E = (error: unknown) => {
      if (error instanceof Error) {
        return new Error(`Operation failed: ${error.message}`) as unknown as E;
      }
      return new Error("Unexpected error occurred") as unknown as E;
    },
  ) =>
  (arg: T): Result<U, E> => {
    try {
      return ok(fn(arg));
    } catch (error: unknown) {
      return err(errorHandler(error));
    }
  };

/**
 * Checks if a value is defined (not undefined).
 * Returns Ok with the value if defined, Err if undefined.
 */
export const defined = <T>(value: T | undefined): Result<T, Error> =>
  value === undefined ? err(new Error("Value is undefined")) : ok(value);

/**
 * Utility function for exhaustive checks and unreachable code paths.
 * Throws an error when called - used for compile-time exhaustiveness checking.
 */
export function unreachable(): never {
  throw new Error("Supposed to be unreachable");
}

/**
 * Branching flow that preserves input/output types.
 * Selects between two functions based on predicate.
 */
export const ifElse =
  <T, U>(
    predicate: PredicateFunction<T>,
    ifTrue: OptionFunction<T, U>,
    ifFalse: OptionFunction<T, U>,
  ) =>
  (value: T): U =>
    predicate(value) ? ifTrue(value) : ifFalse(value);

type OptionFunction<T, U = T> = (x: T) => U;
type PredicateFunction<T> = (x: T) => boolean;

/**
 * Encodes data as formatted JSON string.
 */
export const jsonEncode = (data: unknown): string =>
  JSON.stringify(data, null, 2);

/**
 * Decodes JSON string or Buffer into unknown value, returning Result.
 */
export const jsonDecode = (json: string | Buffer): Result<unknown, Error> =>
  pipe(
    json,
    tryCatch(
      (json) =>
        JSON.parse(Buffer.isBuffer(json) ? json.toString("utf-8") : json),
      (error) => toError(error),
    ),
  );
