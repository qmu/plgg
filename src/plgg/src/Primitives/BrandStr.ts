import { isStr, Result, ValidationError, ok, err, Brand } from "plgg/index";

/**
 * Branded string type.
 */
export type BrandStr<U extends string> = Brand<string, U>;

/**
 * Type guard for branded string.
 */
export const isBrandStr = <U extends string>(
  value: unknown,
): value is BrandStr<U> => isStr(value);

/**
 * Validates and casts to branded string.
 */
export const asBrandStr = <U extends string>(
  value: unknown,
): Result<BrandStr<U>, ValidationError> =>
  isBrandStr<U>(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not a branded string" }));
