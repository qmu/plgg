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
 * A variant with both a tag and content that must be a non-empty string.
 */
export type NonEmptyStr = Box<
  "NonEmptyStr",
  string
>;

/**
 * Validates that a string value is non-empty.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is string =>
  isSoftStr(value) && value.length > 0;

/**
 * Type guard to check if a value is a NonEmptyStr.
 */
const is = (
  value: unknown,
): value is NonEmptyStr =>
  isBoxWithTag("NonEmptyStr")(value) &&
  qualify(value.content);

/**
 * Refinable instance for NonEmptyStr type guards.
 */
export const nonEmptyStrRefinable: Refinable<NonEmptyStr> =
  {
    is,
  };
/**
 * Exported type guard function for NonEmptyStr values.
 */
export const { is: isNonEmptyStr } =
  nonEmptyStrRefinable;

export const asNonEmptyStr = (
  value: unknown,
): Result<NonEmptyStr, InvalidError> =>
  is(value)
    ? newOk(value)
    : qualify(value)
      ? newOk(newBox("NonEmptyStr")(value))
      : newErr(
          new InvalidError({
            message:
              "Value is not a NonEmptyStr (tag-content pair with non-empty string)",
          }),
        );

/**
 * Castable instance for NonEmptyStr safe casting.
 */
export const nonEmptyStrCastable: Castable<NonEmptyStr> =
  {
    as: asNonEmptyStr,
  };
