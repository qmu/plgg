import { Result, ok, err, ValidationError } from "plgg/index";

/**
 * Array type with primitive values.
 */
export type Arr<T extends unknown = unknown> = ReadonlyArray<T>;

/**
 * Type guard for ReadonlyArray<unknown>.
 */
export const isArr = (value: unknown): value is Arr => Array.isArray(value);

/**
 * Validates and casts to array.
 */
export const castArr = (value: unknown): Result<Arr, ValidationError> =>
  isArr(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not an array" }));

/**
 * Validates array property with predicate.
 */
export const every =
  <T>(predicate: (value: unknown) => value is T) =>
  (value: Arr): Result<Arr<T>, ValidationError> =>
    value.every(predicate)
      ? ok(value)
      : err(
          new ValidationError({
            message: "Array elements do not match predicate",
          }),
        );
