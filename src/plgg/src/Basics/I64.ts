import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  Box,
  newOk,
  newErr,
  isBoxWithTag,
  isBigInt,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a 64-bit signed integer (-9223372036854775808n to 9223372036854775807n).
 */
export type I64 = Box<"I64", bigint>;

/**
 * Type guard to check if a value is an I64.
 */
const is = (value: unknown): value is I64 =>
  isBoxWithTag("I64")(value) &&
  isBigInt(value.content) &&
  value.content >= -9223372036854775808n &&
  value.content <= 9223372036854775807n;

/**
 * Refinable instance for I64 type guards.
 */
export const i64Refinable: Refinable<I64> = {
  is,
};
/**
 * Exported type guard function for I64 values.
 */
export const { is: isI64 } = i64Refinable;

export const asI64 = (
  value: unknown,
): Result<I64, InvalidError> =>
  is(value)
    ? newOk(value)
    : newErr(
        new InvalidError({
          message:
            "Value is not an I64 (tag-content pair with bigint -9223372036854775808n to 9223372036854775807n)",
        }),
      );

/**
 * Castable instance for I64 safe casting.
 */
export const i64Castable: Castable<I64> = {
  as: asI64,
};
