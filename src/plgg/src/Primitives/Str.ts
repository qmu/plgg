import { Result, ok, err, InvalidError } from "plgg/index";

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
 * Returns Ok with string if valid, Err with InvalidError if invalid.
 */
export const asStr = (value: unknown): Result<Str, InvalidError> =>
  isStr(value)
    ? ok(value)
    : err(new InvalidError({ message: `${value} is not a string` }));
