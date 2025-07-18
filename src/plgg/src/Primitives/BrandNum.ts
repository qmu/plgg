import { Brand, Result, ok, err, ValidationError, isNum } from "plgg/index";

/**
 * Branded number type.
 */
export type BrandNum<U extends string> = Brand<number, U>;

/**
 * Type guard for branded number.
 */
export const isBrandNum = <U extends string>(
  value: unknown,
): value is BrandNum<U> => isNum(value);

/**
 * Validates and casts to branded number.
 */
export const asBrandNum = <U extends string>(
  value: unknown,
): Result<BrandNum<U>, ValidationError> =>
  isBrandNum<U>(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not a branded number" }));
