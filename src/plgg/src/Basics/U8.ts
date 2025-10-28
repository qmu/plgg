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
 * A variant with both a tag and content that must be an 8-bit unsigned integer (0 to 255).
 */
export type U8 = Box<"U8", number>;

/**
 * Type guard to check if a value is a U8.
 */
const is = (value: unknown): value is U8 =>
  isBoxWithTag("U8")(value) &&
  isInt(value.content) &&
  value.content >= 0 &&
  value.content <= 255;

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

/**
 * Castable instance for U8 safe casting.
 */
export const u8Castable: Castable<U8> = {
  as: (
    value: unknown,
  ): Result<U8, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message:
              "Value is not a U8 (tag-content pair with integer 0 to 255)",
          }),
        ),
};
/**
 * Exported safe casting function for U8 values.
 */
export const { as: asU8 } = u8Castable;

