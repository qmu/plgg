import { Result, ok, err, ValidationError } from "plgg/index";

/**
 * String primitive type.
 */
export type Str = string;

/**
 * Type guard for string.
 */
export const isStr = (value: unknown): value is Str =>
  typeof value === "string";

/**
 * Validates and casts unknown value to string.
 * Returns Ok with string if valid, Err with ValidationError if invalid.
 */
export const asStr = (value: unknown): Result<Str, ValidationError> =>
  isStr(value)
    ? ok(value)
    : err(new ValidationError({ message: `${value} is not a string` }));
