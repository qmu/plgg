import {
  Result,
  ok,
  err,
  InvalidError,
  Refinable0,
  Castable0,
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
 * Refinable instance for string type guards.
 */
export const strRefinable: Refinable0<Str> = {
  is,
};
export const { is: isStr } = strRefinable;

/**
 * Castable instance for string safe casting.
 */
export const strCastable: Castable0<Str> = {
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
export const { as: asStr } = strCastable;

/**
 * Concatenates two strings using curried application.
 */
export const concat =
  (adding: Str) =>
  (base: Str): Str =>
    base + adding;
