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
  box,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a 16-bit unsigned integer (0 to 65535).
 */
export type U16 = Box<"U16", number>;

/**
 * Validates that a value is a valid 16-bit unsigned integer.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is number =>
  isInt(value) && value >= 0 && value <= 65535;

/**
 * Type guard to check if a value is a U16.
 */
const is = (value: unknown): value is U16 =>
  isBoxWithTag("U16")(value) &&
  qualify(value.content);

/**
 * Refinable instance for U16 type guards.
 */
export const u16Refinable: Refinable<U16> = {
  is,
};
/**
 * Exported type guard function for U16 values.
 */
export const { is: isU16 } = u16Refinable;

export const asU16 = (
  value: unknown,
): Result<U16, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(box("U16")(value))
      : err(
          new InvalidError({
            message:
              "Value is not a U16 (tag-content pair with integer 0 to 65535)",
          }),
        );

/**
 * Castable instance for U16 safe casting.
 */
export const u16Castable: Castable<U16> = {
  as: asU16,
};
