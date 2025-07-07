import { Result, ok, err, ValidationError } from "plgg/index";

/**
 * Array type with primitive values.
 */
export type t<T extends unknown = unknown> = ReadonlyArray<T>;

/**
 * Type guard for ReadonlyArray<unknown>.
 */
export const is = (value: unknown): value is t => Array.isArray(value);

/**
 * Validates and casts to object with primitives.
 */
export const cast = (value: unknown): Result<t, ValidationError> =>
  is(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not an object" }));

/**
 * Validates array property with predicate.
 */
export const every =
  <T>(predicate: (value: unknown) => value is T) =>
  (value: t): Result<t<T>, ValidationError> =>
    value.every(predicate)
      ? ok(value)
      : err(new ValidationError({ message: "Value is not an object" }));
