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
 * A variant with both a tag and content that must be an 8-bit unsigned integer (0 to 255).
 */
export type U8 = Box<"U8", number>;

/**
 * Validates that a value is a valid 8-bit unsigned integer.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is number =>
  isInt(value) && value >= 0 && value <= 255;

/**
 * Type guard to check if a value is a U8.
 */
const is = (value: unknown): value is U8 =>
  isBoxWithTag("U8")(value) &&
  qualify(value.content);

/**
 * Refinable instance for U8 type guards.
 */
export const u8Refinable: Refinable<U8> = {
  is,
};
/**
 * Exported type guard function for U8 values.
 */
export const { is: isU8 } = u8Refinable;

export const asU8 = (
  value: unknown,
): Result<U8, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(newBox("U8")(value))
      : err(
          new InvalidError({
            message:
              "Value is not a U8 (tag-content pair with integer 0 to 255)",
          }),
        );

/**
 * Castable instance for U8 safe casting.
 */
export const u8Castable: Castable<U8> = {
  as: asU8,
};
