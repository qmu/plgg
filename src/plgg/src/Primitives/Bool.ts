import { Result, ok, err, ValidationError } from "plgg/index";

/**
 * Boolean primitive type.
 */
export type Bool = boolean;

/**
 * Type guard for boolean.
 */
export const isBool = (value: unknown): value is Bool =>
  typeof value === "boolean";

/**
 * Validates and casts unknown value to boolean.
 * Returns Ok with boolean if valid, Err with ValidationError if invalid.
 */
export const asBool = (value: unknown): Result<Bool, ValidationError> =>
  isBool(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not a boolean" }));
