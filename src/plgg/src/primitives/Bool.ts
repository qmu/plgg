import { Result, ok, err, ValidationError } from "plgg/index";

/**
 * Boolean primitive type.
 */
export type t = boolean;

/**
 * Type guard for boolean.
 */
export const is = (value: unknown): value is t => typeof value === "boolean";

/**
 * Type guard for boolean.
 */
export const cast = (value: unknown): Result<t, ValidationError> =>
  is(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not a boolean" }));

/**
 * Validates value is true.
 */
export const isTrue = (value: unknown): Result<t, ValidationError> =>
  is(value) && value === true
    ? ok(true)
    : err(new ValidationError({ message: "Value is not true" }));

/**
 * Validates value is false.
 */
export const isFalse = (value: unknown): Result<t, ValidationError> =>
  is(value) && value === false
    ? ok(false)
    : err(new ValidationError({ message: "Value is not false" }));
