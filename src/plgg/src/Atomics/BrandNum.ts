import {
  Brand,
  Result,
  newOk,
  newErr,
  InvalidError,
  Num,
  isNum,
} from "plgg/index";

/**
 * Represents branded number values with type-level string labels.
 */
export type BrandNum<U extends string> = Brand<
  Num,
  U
>;

/**
 * JSON-ready representation of BrandNum values.
 */
export type JsonReadyBrandNum = Num;

/**
 * Type predicate to determine if a type is BrandNum.
 */
export type IsBrandNum<T> =
  T extends BrandNum<string> ? true : false;

/**
 * Runtime type guard for branded number values.
 */
export const isBrandNum = <U extends string>(
  value: unknown,
): value is BrandNum<U> => isNum(value);

/**
 * Safely casts values to branded number with validation.
 */
export const asBrandNum = <U extends string>(
  value: unknown,
): Result<BrandNum<U>, InvalidError> =>
  isBrandNum<U>(value)
    ? newOk(value)
    : newErr(
        new InvalidError({
          message:
            "Value is not a branded number",
        }),
      );
