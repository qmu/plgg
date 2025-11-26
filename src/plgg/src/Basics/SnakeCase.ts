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
 * A variant with both a tag and content that must be a snake_case string.
 * Snake_case strings contain only lowercase letters, numbers, and underscores,
 * cannot start or end with an underscore, and cannot have consecutive underscores.
 */
export type SnakeCase = Box<"SnakeCase", string>;

/**
 * Validates that a string value is valid snake_case.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is string => {
  if (!isSoftStr(value) || value.length === 0) {
    return false;
  }
  // Check snake_case pattern:
  // - Only lowercase letters, numbers, and underscores
  // - Cannot start or end with underscore
  // - Cannot have consecutive underscores
  const snakeCasePattern =
    /^[a-z0-9]+(_[a-z0-9]+)*$/;
  return snakeCasePattern.test(value);
};

/**
 * Type guard to check if a value is a SnakeCase.
 */
const is = (value: unknown): value is SnakeCase =>
  isBoxWithTag("SnakeCase")(value) &&
  qualify(value.content);

/**
 * Refinable instance for SnakeCase type guards.
 */
export const snakeCaseRefinable: Refinable<SnakeCase> =
  {
    is,
  };
/**
 * Exported type guard function for SnakeCase values.
 */
export const { is: isSnakeCase } =
  snakeCaseRefinable;

export const asSnakeCase = (
  value: unknown,
): Result<SnakeCase, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(newBox("SnakeCase")(value))
      : err(
          new InvalidError({
            message:
              "Value is not a SnakeCase (tag-content pair with valid snake_case string)",
          }),
        );

/**
 * Castable instance for SnakeCase safe casting.
 */
export const snakeCaseCastable: Castable<SnakeCase> =
  {
    as: asSnakeCase,
  };
