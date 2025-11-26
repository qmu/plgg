import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  Box,
  ok,
  err,
  isBoxWithTag,
  isNum,
  newBox,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a floating-point number.
 */
export type Float = Box<"Float", number>;

/**
 * Validates that a value is a valid finite number.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is number =>
  isNum(value) && isFinite(value);

/**
 * Type guard to check if a value is a Float.
 */
const is = (value: unknown): value is Float =>
  isBoxWithTag("Float")(value) &&
  qualify(value.content);

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
    ? ok(value)
    : qualify(value)
      ? ok(newBox("Float")(value))
      : err(
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
