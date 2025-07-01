import { Result, ValidationError, Brand, Bool, ok, err } from "plgg/index";

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
export const cast = <U extends string>(
  value: unknown,
): Result<t<U>, ValidationError> =>
  is<U>(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not a branded boolean" }));
