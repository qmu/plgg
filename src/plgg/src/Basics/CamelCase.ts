import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  Box,
  newOk,
  newErr,
  isBoxWithTag,
  isSoftStr,
  newBox,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a camelCase string.
 * CamelCase strings start with a lowercase letter and contain only letters and numbers,
 * with each subsequent word starting with an uppercase letter.
 */
export type CamelCase = Box<"CamelCase", string>;

/**
 * Validates that a string value is valid camelCase.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is string => {
  if (!isSoftStr(value) || value.length === 0) {
    return false;
  }
  // Check camelCase pattern:
  // - Must start with lowercase letter
  // - Only letters and numbers allowed
  // - No special characters or spaces
  const camelCasePattern =
    /^[a-z][a-zA-Z0-9]*$/;
  return camelCasePattern.test(value);
};

/**
 * Type guard to check if a value is a CamelCase.
 */
const is = (value: unknown): value is CamelCase =>
  isBoxWithTag("CamelCase")(value) &&
  qualify(value.content);

/**
 * Refinable instance for CamelCase type guards.
 */
export const camelCaseRefinable: Refinable<CamelCase> =
  {
    is,
  };
/**
 * Exported type guard function for CamelCase values.
 */
export const { is: isCamelCase } =
  camelCaseRefinable;

export const asCamelCase = (
  value: unknown,
): Result<CamelCase, InvalidError> =>
  is(value)
    ? newOk(value)
    : qualify(value)
      ? newOk(newBox("CamelCase")(value))
      : newErr(
          new InvalidError({
            message:
              "Value is not a CamelCase (tag-content pair with valid camelCase string)",
          }),
        );

/**
 * Castable instance for CamelCase safe casting.
 */
export const camelCaseCastable: Castable<CamelCase> =
  {
    as: asCamelCase,
  };
