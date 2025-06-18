import {
  Brand,
  Procedural,
  success,
  fail,
  ValidationError,
  Num,
} from "@plgg/index";

/**
 * Branded number type.
 */
export type t<U extends string> = Brand<number, U>;

/**
 * Type guard for branded number.
 */
export const is = <U extends string>(value: unknown): value is t<U> =>
  Num.is(value);

/**
 * Validates and casts to branded number.
 */
export const cast = <U extends string>(value: unknown): Procedural<t<U>> =>
  is<U>(value)
    ? success(value)
    : fail(new ValidationError("Value is not a branded number"));
