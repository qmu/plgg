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
  newBox,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be an alphanumeric string.
 * Alphanumeric strings contain only letters (uppercase or lowercase) and numbers,
 * no spaces or special characters.
 */
export type Alphanumeric = Box<
  "Alphanumeric",
  string
>;

/**
 * Validates that a string value contains only alphanumeric characters.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is string => {
  if (!isSoftStr(value) || value.length === 0) {
    return false;
  }
  // Check alphanumeric pattern:
  // - Only uppercase letters, lowercase letters, and numbers
  // - No spaces or special characters
  const alphanumericPattern = /^[a-zA-Z0-9]+$/;
  return alphanumericPattern.test(value);
};

/**
 * Type guard to check if a value is an Alphanumeric.
 */
const is = (
  value: unknown,
): value is Alphanumeric =>
  isBoxWithTag("Alphanumeric")(value) &&
  qualify(value.content);

/**
 * Refinable instance for Alphanumeric type guards.
 */
export const alphanumericRefinable: Refinable<Alphanumeric> =
  {
    is,
  };
/**
 * Exported type guard function for Alphanumeric values.
 */
export const { is: isAlphanumeric } =
  alphanumericRefinable;

export const asAlphanumeric = (
  value: unknown,
): Result<Alphanumeric, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(newBox("Alphanumeric")(value))
      : err(
          new InvalidError({
            message:
              "Value is not an Alphanumeric (tag-content pair with valid alphanumeric string)",
          }),
        );

/**
 * Castable instance for Alphanumeric safe casting.
 */
export const alphanumericCastable: Castable<Alphanumeric> =
  {
    as: asAlphanumeric,
  };
