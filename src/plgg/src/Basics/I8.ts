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
} from "plgg/index";

/**
 * A variant with both a tag and content that must be an 8-bit signed integer (-128 to 127).
 */
export type I8 = Box<"I8", number>;

/**
 * Type guard to check if a value is an I8.
 */
const is = (value: unknown): value is I8 =>
  isBoxWithTag("I8")(value) &&
  isInt(value.content) &&
  value.content >= -128 &&
  value.content <= 127;

/**
 * Refinable instance for I8 type guards.
 */
export const i8Refinable: Refinable<I8> = {
  is,
};
/**
 * Exported type guard function for I8 values.
 */
export const { is: isI8 } = i8Refinable;

export const asI8 = (
  value: unknown,
): Result<I8, InvalidError> =>
  is(value)
    ? newOk(value)
    : newErr(
        new InvalidError({
          message:
            "Value is not an I8 (tag-content pair with integer -128 to 127)",
        }),
      );

/**
 * Castable instance for I8 safe casting.
 */
export const i8Castable: Castable<I8> = {
  as: asI8,
};
