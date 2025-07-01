import { Brand, Result, ok, err, ValidationError, Num } from "plgg/index";

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
export const cast = <U extends string>(
  value: unknown,
): Result<t<U>, ValidationError> =>
  is<U>(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not a branded number" }));
