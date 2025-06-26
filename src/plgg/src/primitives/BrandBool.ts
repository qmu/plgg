import {
  Procedural,
  success,
  fail,
  ValidationError,
  Brand,
  Bool,
} from "plgg/index";

/**
 * Branded boolean type.
 */
export type t<U extends string> = Brand<boolean, U>;

/**
 * Type guard for branded boolean.
 */
export const is = <U extends string>(value: unknown): value is t<U> =>
  Bool.is(value);

/**
 * Validates and casts to branded boolean.
 */
export const cast = <U extends string>(value: unknown): Procedural<t<U>> =>
  is<U>(value)
    ? success(value)
    : fail(new ValidationError("Value is not a branded boolean"));
