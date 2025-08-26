import {
  Result,
  InvalidError,
  Brand,
  Bool,
  isBool,
  newOk,
  newErr,
} from "plgg/index";

/**
 * Branded boolean type.
 */
export type BrandBool<U extends string> = Brand<
  Bool,
  U
>;

export type IsBrandBool<T> =
  T extends BrandBool<string> ? true : false;

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
): Result<BrandBool<U>, InvalidError> =>
  isBrandBool<U>(value)
    ? newOk(value)
    : newErr(
        new InvalidError({
          message:
            "Value is not a branded boolean",
        }),
      );
