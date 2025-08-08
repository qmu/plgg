import { Result, ok, err, InvalidError } from "plgg/index";

/**
 * String primitive type.
 * Represents JavaScript strings.
 */
export type Str = string;

/**
 * Type guard for string.
 * 
 * @param value - Value to check
 * @returns True if value is a string, false otherwise
 * @example
 * if (isStr(value)) {
 *   // TypeScript knows value is Str
 * }
 */
export const isStr = (value: unknown): value is Str =>
  typeof value === "string";

/**
 * Validates and casts unknown value to string.
 * Returns Ok with string if valid, Err with InvalidError if invalid.
 * 
 * @param value - Value to validate and cast
 * @returns Result containing string or InvalidError
 * @example
 * const result = asStr("hello"); // Ok("hello")
 * const invalid = asStr(42); // Err(InvalidError)
 */
export const asStr = (value: unknown): Result<Str, InvalidError> =>
  isStr(value)
    ? ok(value)
    : err(new InvalidError({ message: `${value} is not a string` }));

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
