import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  Box,
  ok,
  err,
  isBoxWithTag,
  isBigInt,
  box,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a 64-bit unsigned integer (0n to 18446744073709551615n).
 */
export type U64 = Box<"U64", bigint>;

/**
 * Validates that a value is a valid 64-bit unsigned integer.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is bigint =>
  isBigInt(value) &&
  value >= 0n &&
  value <= 18446744073709551615n;

/**
 * Type guard to check if a value is a U64.
 */
const is = (value: unknown): value is U64 =>
  isBoxWithTag("U64")(value) &&
  qualify(value.content);

/**
 * Refinable instance for U64 type guards.
 */
export const u64Refinable: Refinable<U64> = {
  is,
};
/**
 * Exported type guard function for U64 values.
 */
export const { is: isU64 } = u64Refinable;

export const asU64 = (
  value: unknown,
): Result<U64, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(box("U64")(value))
      : err(
          new InvalidError({
            message:
              "Value is not a U64 (tag-content pair with bigint 0n to 18446744073709551615n)",
          }),
        );

/**
 * Castable instance for U64 safe casting.
 */
export const u64Castable: Castable<U64> = {
  as: asU64,
};
