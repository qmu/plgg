import { Result, ok, err, InvalidError } from "plgg/index";

/**
 * Boolean true constant for type-safe boolean operations.
 * @constant
 */
export const TRUE = true as const;

/**
 * Boolean false constant for type-safe boolean operations.
 * @constant
 */
export const FALSE = false as const;

/**
 * Boolean primitive type.
 */
export type Bool = typeof TRUE | typeof FALSE;

/**
 * Type guard for boolean values.
 * 
 * @param value - The value to check
 * @returns True if value is a boolean, false otherwise
 * @example
 * if (isBool(value)) {
 *   // TypeScript knows value is Bool
 * }
 */
export const isBool = (value: unknown): value is Bool =>
  typeof value === "boolean";

/**
 * Validates and casts unknown value to boolean.
 * Returns Ok with boolean if valid, Err with InvalidError if invalid.
 * 
 * @param value - The value to validate and cast
 * @returns Result containing boolean or InvalidError
 * @example
 * const result = asBool(true); // Ok(true)
 * const invalid = asBool("not boolean"); // Err(InvalidError)
 */
export const asBool = (value: unknown): Result<Bool, InvalidError> =>
  isBool(value)
    ? ok(value)
    : err(new InvalidError({ message: "Value is not a boolean" }));
