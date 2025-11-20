import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  Box,
  newOk,
  newErr,
  isBoxWithTag,
  isInt,
  newBox,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a 32-bit unsigned integer (0 to 4294967295).
 */
export type U32 = Box<"U32", number>;

/**
 * Validates that a value is a valid 32-bit unsigned integer.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is number =>
  isInt(value) &&
  value >= 0 &&
  value <= 4294967295;

/**
 * Type guard to check if a value is a U32.
 */
const is = (value: unknown): value is U32 =>
  isBoxWithTag("U32")(value) &&
  qualify(value.content);

/**
 * Refinable instance for U32 type guards.
 */
export const u32Refinable: Refinable<U32> = {
  is,
};
/**
 * Exported type guard function for U32 values.
 */
export const { is: isU32 } = u32Refinable;

export const asU32 = (
  value: unknown,
): Result<U32, InvalidError> =>
  is(value)
    ? newOk(value)
    : qualify(value)
      ? newOk(newBox("U32")(value))
      : newErr(
          new InvalidError({
            message:
              "Value is not a U32 (tag-content pair with integer 0 to 4294967295)",
          }),
        );

/**
 * Castable instance for U32 safe casting.
 */
export const u32Castable: Castable<U32> = {
  as: asU32,
};

