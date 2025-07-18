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
 * Type guard for boolean.
 */
export const asBool = (value: unknown): Result<Bool, ValidationError> =>
  isBool(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not a boolean" }));
