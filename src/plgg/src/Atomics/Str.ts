import { Result, ok, err, InvalidError, Refinement } from "plgg/index";

/**
 * String primitive type.
 * Represents JavaScript strings.
 */
export type Str = string;

/**
 * Refinement instance for string validation and casting.
 * Provides type-safe string validation following the standard Refinement pattern.
 */
export const strRefinement: Refinement<Str> = {
  is: (value: unknown): value is Str => typeof value === "string",
  as: (value: unknown): Result<Str, InvalidError> =>
    typeof value === "string"
      ? ok(value)
      : err(new InvalidError({ message: `${value} is not a string` })),
};
export const { is: isStr, as: asStr } = strRefinement;

/**
 * Concatenates two strings using curried application.
 * 
 * @param adding - The string to append
 * @returns Function that takes the base string and returns the concatenated result
 * @example
 * const addWorld = concat(" World");
 * const result = addWorld("Hello"); // "Hello World"
 */
export const concat =
  (adding: Str) =>
  (base: Str): Str =>
    base + adding;
