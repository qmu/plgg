import { Result, ok, err, InvalidError } from "plgg/index";

/**
 * Array type with primitive values.
 * Readonly array that can contain any type of values.
 * 
 * @template T - Type of array elements (defaults to unknown)
 */
export type Arr<T extends unknown = unknown> = ReadonlyArray<T>;

/**
 * Type guard for ReadonlyArray<unknown>.
 * 
 * @param value - Value to check
 * @returns True if value is an array, false otherwise
 * @example
 * if (isArr(value)) {
 *   // TypeScript knows value is Arr
 * }
 */
export const isArr = (value: unknown): value is Arr => Array.isArray(value);

/**
 * Validates and casts unknown value to array.
 * 
 * @param value - Value to validate and cast
 * @returns Result with array if valid, InvalidError if not
 * @example
 * const result = castArr([1, 2, 3]); // Ok([1, 2, 3])
 * const invalid = castArr("not array"); // Err(InvalidError)
 */
export const castArr = (value: unknown): Result<Arr, InvalidError> =>
  isArr(value)
    ? ok(value)
    : err(new InvalidError({ message: "Value is not an array" }));

/**
 * Validates that all array elements match a type predicate.
 * Returns a typed array if all elements pass the predicate.
 * 
 * @param predicate - Type guard function to validate each element
 * @returns Function that validates arrays using the predicate
 * @example
 * const validateNumbers = every(isNum);
 * const result = validateNumbers([1, 2, 3]); // Ok([1, 2, 3])
 * const invalid = validateNumbers([1, "2", 3]); // Err(InvalidError)
 */
export const every =
  <T>(predicate: (value: unknown) => value is T) =>
  (value: Arr): Result<Arr<T>, InvalidError> =>
    value.every(predicate)
      ? ok(value)
      : err(
          new InvalidError({
            message: "Array elements do not match predicate",
          }),
        );
