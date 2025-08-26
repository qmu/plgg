import {
  Result,
  newOk,
  newErr,
  InvalidError,
  Refinable0,
  Castable0,
} from "plgg/index";

/**
 * Represents JavaScript string values.
 */
export type Str = string;

/**
 * Type predicate to determine if a type is Str.
 */
export type IsStr<T> = T extends Str
  ? true
  : false;

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
/**
 * Exported type guard function for string values.
 */
export const { is: isStr } = strRefinable;

/**
 * Castable instance for string safe casting.
 */
export const strCastable: Castable0<Str> = {
  as: (
    value: unknown,
  ): Result<Str, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: `${value} is not a string`,
          }),
        ),
};
/**
 * Exported safe casting function for string values.
 */
export const { as: asStr } = strCastable;

/**
 * Concatenates two strings using curried application.
 */
export const concat =
  (adding: Str) =>
  (base: Str): Str =>
    base + adding;
