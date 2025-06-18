import {
  Str,
  ValidationError,
  Procedural,
  success,
  fail,
  Brand,
} from "plgg/lib/index";

/**
 * Branded string type.
 */
export type t<U extends string> = Brand<string, U>;

/**
 * Type guard for branded string.
 */
export const is = <U extends string>(value: unknown): value is t<U> =>
  Str.is(value);

/**
 * Validates and casts to branded string.
 */
export const cast = <U extends string>(value: unknown): Procedural<t<U>> =>
  is<U>(value)
    ? success(value)
    : fail(new ValidationError("Value is not a branded string"));
