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
 * Represents branded boolean values with type-level string labels.
 */
export type BrandBool<U extends string> = Brand<
  Bool,
  U
>;

/**
 * JSON-ready representation of BrandBool values.
 */
export type JsonReadyBrandBool = Bool;

/**
 * Type predicate to determine if a type is BrandBool.
 */
export type IsBrandBool<T> =
  T extends BrandBool<string> ? true : false;

/**
 * Runtime type guard for branded boolean values.
 */
export const isBrandBool = <U extends string>(
  value: unknown,
): value is BrandBool<U> => isBool(value);

/**
 * Safely casts values to branded boolean with validation.
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
