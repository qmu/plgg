import { Result, ok, err, InvalidError } from "plgg/index";

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
 * Returns Ok with boolean if valid, Err with InvalidError if invalid.
 */
export const asBool = (value: unknown): Result<Bool, InvalidError> =>
  isBool(value)
    ? ok(value)
    : err(new InvalidError({ message: "Value is not a boolean" }));
