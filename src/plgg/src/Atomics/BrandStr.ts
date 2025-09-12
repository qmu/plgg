import {
  Result,
  InvalidError,
  Str,
  Brand,
  isStr,
  newOk,
  newErr,
} from "plgg/index";

/**
 * Represents branded string values with type-level string labels.
 */
export type BrandStr<U extends string> = Brand<
  Str,
  U
>;

/**
 * JSON-ready representation of BrandStr values.
 */
export type JsonReadyBrandStr = Str;

/**
 * Type predicate to determine if a type is BrandStr.
 */
export type IsBrandStr<T> =
  T extends BrandStr<string> ? true : false;

/**
 * Runtime type guard for branded string values.
 */
export const isBrandStr = <U extends string>(
  value: unknown,
): value is BrandStr<U> => isStr(value);

/**
 * Safely casts values to branded string with validation.
 */
export const asBrandStr = <U extends string>(
  value: unknown,
): Result<BrandStr<U>, InvalidError> =>
  isBrandStr<U>(value)
    ? newOk(value)
    : newErr(
        new InvalidError({
          message:
            "Value is not a branded string",
        }),
      );
