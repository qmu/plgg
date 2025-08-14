import {
  isStr,
  Result,
  InvalidError,
  ok,
  err,
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
    ? ok(value)
    : err(
        new InvalidError({
          message:
            "Value is not a branded string",
        }),
      );
