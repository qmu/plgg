import { Result, ValidationError, Brand, isBool, ok, err } from "plgg/index";

/**
 * Branded boolean type.
 */
export type BrandBool<U extends string> = Brand<boolean, U>;

/**
 * Type guard for branded boolean.
 */
export const isBrandBool = <U extends string>(
  value: unknown,
): value is BrandBool<U> => isBool(value);

/**
 * Validates and casts to branded boolean.
 */
export const asBrandBool = <U extends string>(
  value: unknown,
): Result<BrandBool<U>, ValidationError> =>
  isBrandBool<U>(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not a branded boolean" }));
