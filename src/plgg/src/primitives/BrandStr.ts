import { Str, Result, ValidationError, ok, err, Brand } from "plgg/index";

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
export const cast = <U extends string>(
  value: unknown,
): Result<t<U>, ValidationError> =>
  is<U>(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not a branded string" }));
