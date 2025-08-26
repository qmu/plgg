import {
  isStr,
  Result,
  InvalidError,
  newOk,
  newErr,
  Str,
  Brand,
} from "plgg/index";

/**
 * Branded string type.
 */
export type BrandStr<U extends string> = Brand<
  Str,
  U
>;

export type IsBrandStr<T> =
  T extends BrandStr<string> ? true : false;

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
): Result<BrandStr<U>, InvalidError> =>
  isBrandStr<U>(value)
    ? newOk(value)
    : newErr(
        new InvalidError({
          message:
            "Value is not a branded string",
        }),
      );
