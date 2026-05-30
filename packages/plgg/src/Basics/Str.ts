import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  Box,
  ok,
  err,
  isBoxWithTag,
  isSoftStr,
  box,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a non-empty string.
 */
export type Str = Box<"Str", string>;

/**
 * Validates that a string value is non-empty.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is string =>
  isSoftStr(value) && value.length > 0;

/**
 * Type guard to check if a value is a Str.
 */
const is = (value: unknown): value is Str =>
  isBoxWithTag("Str")(value) &&
  qualify(value.content);

/**
 * Refinable instance for Str type guards.
 */
export const strRefinable: Refinable<Str> = {
  is,
};
/**
 * Exported type guard function for Str values.
 */
export const { is: isStr } = strRefinable;

export const asStr = (
  value: unknown,
): Result<Str, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(box("Str")(value))
      : err(
          new InvalidError({
            message:
              "Value is not a Str (tag-content pair with non-empty string)",
          }),
        );

/**
 * Castable instance for Str safe casting.
 */
export const strCastable: Castable<Str> = {
  as: asStr,
};
