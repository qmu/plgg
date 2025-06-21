import { Procedural, fail, ValidationError, success } from "plgg/index";

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
export const cast = (value: unknown): Procedural<t> =>
  is(value)
    ? success(value)
    : fail(new ValidationError("Value is not an object"));

/**
 * Validates array property with predicate.
 */
export const every =
  <T>(predicate: (value: unknown) => value is T) =>
  (value: t): Procedural<t<T>> =>
    value.every(predicate)
      ? success(value)
      : fail(new ValidationError("Value is not an object"));
