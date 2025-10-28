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
 * A variant with both a tag and content that must be a 128-bit signed integer.
 * Range: -170141183460469231731687303715884105728n to 170141183460469231731687303715884105727n
 */
export type I128 = Box<"I128", bigint>;

/**
 * Type guard to check if a value is an I128.
 */
const is = (value: unknown): value is I128 =>
  isBoxWithTag("I128")(value) &&
  isBigInt(value.content) &&
  value.content >=
    -170141183460469231731687303715884105728n &&
  value.content <=
    170141183460469231731687303715884105727n;

/**
 * Refinable instance for I128 type guards.
 */
export const i128Refinable: Refinable<I128> = {
  is,
};
/**
 * Exported type guard function for I128 values.
 */
export const { is: isI128 } = i128Refinable;

export const asI128 = (
  value: unknown,
): Result<I128, InvalidError> =>
  is(value)
    ? newOk(value)
    : newErr(
        new InvalidError({
          message:
            "Value is not an I128 (tag-content pair with bigint in 128-bit signed range)",
        }),
      );

/**
 * Castable instance for I128 safe casting.
 */
export const i128Castable: Castable<I128> = {
  as: asI128,
};
