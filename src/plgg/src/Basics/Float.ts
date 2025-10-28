import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  Box,
  newOk,
  newErr,
  isBoxWithTag,
  isNum,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a floating-point number.
 */
export type Float = Box<"Float", number>;

/**
 * Type guard to check if a value is a Float.
 */
const is = (value: unknown): value is Float =>
  isBoxWithTag("Float")(value) &&
  isNum(value.content) &&
  isFinite(value.content);

/**
 * Refinable instance for Float type guards.
 */
export const floatRefinable: Refinable<Float> = {
  is,
};
/**
 * Exported type guard function for Float values.
 */
export const { is: isFloat } = floatRefinable;

export const asFloat = (
  value: unknown,
): Result<Float, InvalidError> =>
  is(value)
    ? newOk(value)
    : newErr(
        new InvalidError({
          message:
            "Value is not a Float (tag-content pair with finite number)",
        }),
      );

/**
 * Castable instance for Float safe casting.
 */
export const floatCastable: Castable<Float> = {
  as: asFloat,
};

