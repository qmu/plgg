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
 * A variant with both a tag and content that must be a 16-bit signed integer (-32768 to 32767).
 */
export type I16 = Box<"I16", number>;

/**
 * Validates that a value is a valid 16-bit signed integer.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is number =>
  isInt(value) &&
  value >= -32768 &&
  value <= 32767;

/**
 * Type guard to check if a value is an I16.
 */
const is = (value: unknown): value is I16 =>
  isBoxWithTag("I16")(value) &&
  qualify(value.content);

/**
 * Refinable instance for I16 type guards.
 */
export const i16Refinable: Refinable<I16> = {
  is,
};
/**
 * Exported type guard function for I16 values.
 */
export const { is: isI16 } = i16Refinable;

export const asI16 = (
  value: unknown,
): Result<I16, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(box("I16")(value))
      : err(
          new InvalidError({
            message:
              "Value is not an I16 (tag-content pair with integer -32768 to 32767)",
          }),
        );

/**
 * Castable instance for I16 safe casting.
 */
export const i16Castable: Castable<I16> = {
  as: asI16,
};
