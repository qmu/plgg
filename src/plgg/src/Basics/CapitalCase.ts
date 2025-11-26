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
 * A variant with both a tag and content that must be a Capital Case string.
 * Capital Case strings contain words separated by spaces, with each word starting
 * with an uppercase letter followed by lowercase letters. Only letters and spaces allowed.
 */
export type CapitalCase = Box<
  "CapitalCase",
  string
>;

/**
 * Validates that a string value is valid Capital Case.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is string => {
  if (!isSoftStr(value) || value.length === 0) {
    return false;
  }
  // Check Capital Case pattern:
  // - Each word starts with uppercase letter followed by lowercase letters
  // - Words separated by single spaces
  // - Cannot start or end with space
  // - No consecutive spaces
  const capitalCasePattern =
    /^[A-Z][a-z]*( [A-Z][a-z]*)*$/;
  return capitalCasePattern.test(value);
};

/**
 * Type guard to check if a value is a CapitalCase.
 */
const is = (
  value: unknown,
): value is CapitalCase =>
  isBoxWithTag("CapitalCase")(value) &&
  qualify(value.content);

/**
 * Refinable instance for CapitalCase type guards.
 */
export const capitalCaseRefinable: Refinable<CapitalCase> =
  {
    is,
  };
/**
 * Exported type guard function for CapitalCase values.
 */
export const { is: isCapitalCase } =
  capitalCaseRefinable;

export const asCapitalCase = (
  value: unknown,
): Result<CapitalCase, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(newBox("CapitalCase")(value))
      : err(
          new InvalidError({
            message:
              "Value is not a CapitalCase (tag-content pair with valid Capital Case string)",
          }),
        );

/**
 * Castable instance for CapitalCase safe casting.
 */
export const capitalCaseCastable: Castable<CapitalCase> =
  {
    as: asCapitalCase,
  };
