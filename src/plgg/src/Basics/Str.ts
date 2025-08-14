import {
  Result,
  ok,
  err,
  InvalidError,
  Refinement,
} from "plgg/index";

/**
 * String primitive type.
 * Represents JavaScript strings.
 */
export type Str = string;

/**
 * Type guard to check if a value is a Str.
 */
const is = (value: unknown): value is Str =>
  typeof value === "string";

/**
 * Refinement instance for string validation and casting.
 * Provides type-safe string validation following the standard Refinement pattern.
 */
export const strRefinement: Refinement<Str> = {
  is,
  as: (
    value: unknown,
  ): Result<Str, InvalidError> =>
    is(value)
      ? ok(value)
      : err(
          new InvalidError({
            message: `${value} is not a string`,
          }),
        ),
};
export const { is: isStr, as: asStr } =
  strRefinement;

/**
 * Concatenates two strings using curried application.
 */
export const concat =
  (adding: Str) =>
  (base: Str): Str =>
    base + adding;
