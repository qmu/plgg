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
 * A variant with both a tag and content that must be a PascalCase string.
 * PascalCase strings start with an uppercase letter and contain only letters and numbers,
 * with each subsequent word starting with an uppercase letter.
 */
export type PascalCase = Box<
  "PascalCase",
  string
>;

/**
 * Validates that a string value is valid PascalCase.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is string => {
  if (!isSoftStr(value) || value.length === 0) {
    return false;
  }
  // Check PascalCase pattern:
  // - Must start with uppercase letter
  // - Only letters and numbers allowed
  // - No special characters or spaces
  const pascalCasePattern = /^[A-Z][a-zA-Z0-9]*$/;
  return pascalCasePattern.test(value);
};

/**
 * Type guard to check if a value is a PascalCase.
 */
const is = (
  value: unknown,
): value is PascalCase =>
  isBoxWithTag("PascalCase")(value) &&
  qualify(value.content);

/**
 * Refinable instance for PascalCase type guards.
 */
export const pascalCaseRefinable: Refinable<PascalCase> =
  {
    is,
  };
/**
 * Exported type guard function for PascalCase values.
 */
export const { is: isPascalCase } =
  pascalCaseRefinable;

export const asPascalCase = (
  value: unknown,
): Result<PascalCase, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(box("PascalCase")(value))
      : err(
          new InvalidError({
            message:
              "Value is not a PascalCase (tag-content pair with valid PascalCase string)",
          }),
        );

/**
 * Castable instance for PascalCase safe casting.
 */
export const pascalCaseCastable: Castable<PascalCase> =
  {
    as: asPascalCase,
  };
