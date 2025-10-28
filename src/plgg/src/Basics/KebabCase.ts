import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  Packable,
  Box,
  newOk,
  newErr,
  isBoxWithTag,
  isStr,
  newBox,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a kebab-case string.
 * Kebab-case strings contain only lowercase letters, numbers, and hyphens,
 * cannot start or end with a hyphen, and cannot have consecutive hyphens.
 */
export type KebabCase = Box<
  "KebabCase",
  string
>;

/**
 * Validates that a string value is valid kebab-case.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is string => {
  if (!isStr(value) || value.length === 0) {
    return false;
  }
  // Check kebab-case pattern:
  // - Only lowercase letters, numbers, and hyphens
  // - Cannot start or end with hyphen
  // - Cannot have consecutive hyphens
  const kebabCasePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return kebabCasePattern.test(value);
};

/**
 * Type guard to check if a value is a KebabCase.
 */
const is = (
  value: unknown,
): value is KebabCase =>
  isBoxWithTag("KebabCase")(value) &&
  qualify(value.content);

/**
 * Refinable instance for KebabCase type guards.
 */
export const kebabCaseRefinable: Refinable<KebabCase> =
  {
    is,
  };
/**
 * Exported type guard function for KebabCase values.
 */
export const { is: isKebabCase } =
  kebabCaseRefinable;

/**
 * Castable instance for KebabCase safe casting.
 */
export const kebabCaseCastable: Castable<unknown, KebabCase> =
  {
    as: (
      value: unknown,
    ): Result<KebabCase, InvalidError> =>
      is(value)
        ? newOk(value)
        : newErr(
            new InvalidError({
              message:
                "Value is not a KebabCase (tag-content pair with valid kebab-case string)",
            }),
          ),
  };
/**
 * Exported safe casting function for KebabCase values.
 */
export const { as: asKebabCase } =
  kebabCaseCastable;

/**
 * Packable instance for KebabCase construction.
 */
export const kebabCasePackable: Packable<
  Result<KebabCase, InvalidError>
> = {
  packAs: (
    value: unknown,
  ): Result<KebabCase, InvalidError> =>
    qualify(value)
      ? newOk(newBox("KebabCase")(value))
      : newErr(
          new InvalidError({
            message:
              "Cannot create KebabCase: value must be a valid kebab-case string (lowercase letters, numbers, hyphens; no leading/trailing/consecutive hyphens)",
          }),
        ),
};
/**
 * Exported constructor function for KebabCase values.
 */
export const { packAs: packAsKebabCase } =
  kebabCasePackable;
