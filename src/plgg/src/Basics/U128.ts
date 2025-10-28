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
 * A variant with both a tag and content that must be a 128-bit unsigned integer.
 * Range: 0n to 340282366920938463463374607431768211455n
 */
export type U128 = Box<"U128", bigint>;

/**
 * Type guard to check if a value is a U128.
 */
const is = (value: unknown): value is U128 =>
  isBoxWithTag("U128")(value) &&
  isBigInt(value.content) &&
  value.content >= 0n &&
  value.content <=
    340282366920938463463374607431768211455n;

/**
 * Refinable instance for U128 type guards.
 */
export const u128Refinable: Refinable<U128> = {
  is,
};
/**
 * Exported type guard function for U128 values.
 */
export const { is: isU128 } = u128Refinable;

export const asU128 = (
  value: unknown,
): Result<U128, InvalidError> =>
  is(value)
    ? newOk(value)
    : newErr(
        new InvalidError({
          message:
            "Value is not a U128 (tag-content pair with bigint in 128-bit unsigned range)",
        }),
      );

/**
 * Castable instance for U128 safe casting.
 */
export const u128Castable: Castable<U128> = {
  as: asU128,
};

