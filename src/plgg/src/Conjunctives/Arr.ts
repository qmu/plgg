import { Result, ok, err, InvalidError } from "plgg/index";

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
export const castArr = (value: unknown): Result<Arr, InvalidError> =>
  isArr(value)
    ? ok(value)
    : err(new InvalidError({ message: "Value is not an array" }));

/**
 * Validates array property with predicate.
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
