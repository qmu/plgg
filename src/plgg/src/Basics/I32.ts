import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  Box,
  ok,
  err,
  isBoxWithTag,
  isInt,
  newBox,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a 32-bit signed integer (-2147483648 to 2147483647).
 */
export type I32 = Box<"I32", number>;

/**
 * Validates that a value is a valid 32-bit signed integer.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is number =>
  isInt(value) &&
  value >= -2147483648 &&
  value <= 2147483647;

/**
 * Type guard to check if a value is an I32.
 */
const is = (value: unknown): value is I32 =>
  isBoxWithTag("I32")(value) &&
  qualify(value.content);

/**
 * Refinable instance for I32 type guards.
 */
export const i32Refinable: Refinable<I32> = {
  is,
};
/**
 * Exported type guard function for I32 values.
 */
export const { is: isI32 } = i32Refinable;

export const asI32 = (
  value: unknown,
): Result<I32, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(newBox("I32")(value))
      : err(
          new InvalidError({
            message:
              "Value is not an I32 (tag-content pair with integer -2147483648 to 2147483647)",
          }),
        );

/**
 * Castable instance for I32 safe casting.
 */
export const i32Castable: Castable<I32> = {
  as: asI32,
};
