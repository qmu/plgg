import { Result, pipe, ok, err, InvalidError, toError } from "plgg/index";

/**
 * Simple function composition utility.
 * Applies a function to a value - useful for pipeline operations.
 * 
 * @param fn - Function to apply
 * @returns Function that applies fn to its argument
 * @example
 * pipe(5, hold(x => x * 2)); // 10
 */
export const hold =
  <T, U>(fn: (x: T) => U) =>
  (x: T) =>
    fn(x);

/**
 * Debug utility that logs a value and returns it unchanged.
 * Useful for debugging values in pipeline operations.
 * 
 * @param value - Value to debug and return
 * @returns The same value unchanged
 * @example
 * pipe(data, debug, processData); // logs data, then processes it
 */
export const debug = <T>(value: T): T => {
  console.debug(value);
  return value;
};

/**
 * Validates a value against a predicate function.
 * Returns Ok if predicate passes, Err with InvalidError if it fails.
 * 
 * @param predicate - Function that returns true if value is valid
 * @param errMessage - Optional custom error message
 * @returns Function that validates values using the predicate
 * @example
 * const validatePositive = refine((n: number) => n > 0, "Must be positive");
 * validatePositive(5); // Ok(5)
 * validatePositive(-1); // Err(InvalidError)
 */
export const refine =
  <T>(predicate: (arg: T) => boolean, errMessage?: string) =>
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

/**
 * Wraps a function to catch exceptions and return Result.
 * Converts throwing functions into Result-returning functions.
 * 
 * @param fn - Function that might throw exceptions
 * @param errorHandler - Optional function to transform caught errors
 * @returns Function that returns Result instead of throwing
 * @example
 * const safeParseInt = tryCatch((s: string) => parseInt(s));
 * safeParseInt("123"); // Ok(123)
 * safeParseInt("invalid"); // Ok(NaN) - parseInt doesn't throw
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
 * 
 * @param value - Value to check for definition
 * @returns Result containing the value or error
 * @example
 * defined("hello"); // Ok("hello")
 * defined(undefined); // Err(Error("Value is undefined"))
 */
export const defined = <T>(value: T | undefined): Result<T, Error> =>
  value === undefined ? err(new Error("Value is undefined")) : ok<T>(value);

/**
 * Encodes data as formatted JSON string.
 * 
 * @param data - Data to encode as JSON
 * @returns Formatted JSON string with 2-space indentation
 * @example
 * jsonEncode({ name: "John", age: 30 }); // "{
  "name": "John",
  "age": 30
}"
 */
export const jsonEncode = (data: unknown): string =>
  JSON.stringify(data, null, 2);

/**
 * Decodes JSON string or Buffer into unknown value, returning Result.
 * 
 * @param json - JSON string or Buffer to decode
 * @returns Result containing parsed value or error
 * @example
 * jsonDecode('{"name": "John"}'); // Ok({ name: "John" })
 * jsonDecode('invalid json'); // Err(SyntaxError)
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
