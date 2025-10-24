import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  Newable,
  Box,
  newOk,
  newErr,
  isBoxWithTag,
  isStr,
  newBox,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a non-empty string.
 */
export type NonEmptyStr = Box<"NonEmptyStr", string>;

/**
 * Type guard to check if a value is a NonEmptyStr.
 */
const is = (value: unknown): value is NonEmptyStr =>
  isBoxWithTag("NonEmptyStr")(value) &&
  isStr(value.content) &&
  value.content.length > 0;

/**
 * Refinable instance for NonEmptyStr type guards.
 */
export const nonEmptyStrRefinable: Refinable<NonEmptyStr> = {
  is,
};
/**
 * Exported type guard function for NonEmptyStr values.
 */
export const { is: isNonEmptyStr } = nonEmptyStrRefinable;

/**
 * Castable instance for NonEmptyStr safe casting.
 */
export const nonEmptyStrCastable: Castable<NonEmptyStr> = {
  as: (
    value: unknown,
  ): Result<NonEmptyStr, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message:
              "Value is not a NonEmptyStr (tag-content pair with non-empty string)",
          }),
        ),
};
/**
 * Exported safe casting function for NonEmptyStr values.
 */
export const { as: asNonEmptyStr } = nonEmptyStrCastable;

/**
 * Newable instance for NonEmptyStr construction.
 */
export const nonEmptyStrNewable: Newable<
  Result<NonEmptyStr, InvalidError>,
  string
> = {
  new: (
    value: string,
  ): Result<NonEmptyStr, InvalidError> =>
    value.length > 0
      ? newOk(newBox("NonEmptyStr")(value))
      : newErr(
          new InvalidError({
            message:
              "Cannot create NonEmptyStr from empty string",
          }),
        ),
};
/**
 * Exported constructor function for NonEmptyStr values.
 */
export const { new: newNonEmptyStr } =
  nonEmptyStrNewable;
